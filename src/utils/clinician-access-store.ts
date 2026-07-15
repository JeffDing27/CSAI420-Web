export interface ClinicianAccessRequest {
  clinicianUsername: string;
  customerEmail: string;
  requestDate: string;
  status: "pending" | "approved" | "denied";
}

// Vercel KV (Upstash Redis) REST API wrapper using native fetch
// This avoids needing to install @vercel/kv when disk space is an issue
async function kvGet<T>(key: string): Promise<T | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    console.warn("KV_REST_API_URL or KV_REST_API_TOKEN is missing. Please add them in Vercel.");
    return globalFallbackStore.get(key) as T | null || null;
  }

  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  
  try {
    return JSON.parse(data.result) as T;
  } catch(e) {
    return data.result as T;
  }
}

async function kvSet(key: string, value: any): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    globalFallbackStore.set(key, value);
    return;
  }

  const valString = typeof value === 'string' ? value : JSON.stringify(value);
  const res = await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: valString
  });
  
  // Make sure KV write is fully awaited
  await res.text();
}

// Graceful fallback for local testing if KV env vars are not set
const globalForFallback = globalThis as unknown as { __fallbackStore: Map<string, any> };
const globalFallbackStore = globalForFallback.__fallbackStore ?? new Map<string, any>();
if (process.env.NODE_ENV !== "production") {
  globalForFallback.__fallbackStore = globalFallbackStore;
}

export async function addClinicianAccessRequest(customerEmail: string, clinicianUsername: string): Promise<void> {
  const normalizedEmail = decodeURIComponent(customerEmail).trim().toLowerCase();
  const normalizedClinician = clinicianUsername.trim().toLowerCase();
  
  const indexKey = `clinicianAccessRequestIndex:${normalizedEmail}`;
  const requestKey = `clinicianAccessRequest:${normalizedEmail}:${normalizedClinician}`;
  
  const requestDate = new Date().toISOString();
  
  const newRequest: ClinicianAccessRequest = {
    clinicianUsername, // Preserve original case
    customerEmail,     // Preserve original case for the JSON output
    requestDate,
    status: "pending"
  };

  // 1. Save request object to the individual request key using kvSet
  await kvSet(requestKey, newRequest);
  
  // 2. Read index array from index key
  let index: string[] = (await kvGet<string[]>(indexKey)) || [];
  
  // 3. Add normalizedClinicianUsername if not already present
  if (!index.includes(normalizedClinician)) {
    index.push(normalizedClinician);
  }
  
  // 4. Save the updated index array using kvSet
  await kvSet(indexKey, index);
  
  // 5. Immediately read back the individual request key and index key
  await kvGet<ClinicianAccessRequest>(requestKey);
  await kvGet<string[]>(indexKey);
}

export async function getClinicianAccessRequests(customerEmail: string): Promise<ClinicianAccessRequest[]> {
  const normalizedEmail = decodeURIComponent(customerEmail).trim().toLowerCase();
  const indexKey = `clinicianAccessRequestIndex:${normalizedEmail}`;
  
  const index = (await kvGet<string[]>(indexKey)) || [];
  
  const requests: ClinicianAccessRequest[] = [];
  
  for (const clinician of index) {
    const requestKey = `clinicianAccessRequest:${normalizedEmail}:${clinician}`;
    const req = await kvGet<ClinicianAccessRequest>(requestKey);
    if (req) {
      requests.push(req);
    }
  }
  
  return requests;
}

export async function deleteClinicianAccessRequest(customerEmail: string, clinicianUsername: string): Promise<boolean> {
  const normalizedEmail = decodeURIComponent(customerEmail).trim().toLowerCase();
  const normalizedClinician = clinicianUsername.trim().toLowerCase();
  
  const indexKey = `clinicianAccessRequestIndex:${normalizedEmail}`;
  const requestKey = `clinicianAccessRequest:${normalizedEmail}:${normalizedClinician}`;
  
  const req = await kvGet<ClinicianAccessRequest>(requestKey);
  if (!req) {
    return false;
  }
  
  // Remove the clinician key from the index and save the index
  let index = (await kvGet<string[]>(indexKey)) || [];
  index = index.filter(c => c !== normalizedClinician);
  await kvSet(indexKey, index);
  
  // Delete the individual request key by setting to null
  await kvSet(requestKey, null);
  
  return true;
}
