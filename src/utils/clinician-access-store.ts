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
  const key = `clinicianAccessRequests:${normalizedEmail}`;
  
  let attempts = 0;
  let success = false;

  while (!success && attempts < 5) {
    let requests: ClinicianAccessRequest[] = (await kvGet<ClinicianAccessRequest[]>(key)) || [];
    
    const existingIndex = requests.findIndex(
      req => req.clinicianUsername.toLowerCase() === clinicianUsername.toLowerCase()
    );

    const requestDate = new Date().toISOString();
    
    const newRequest: ClinicianAccessRequest = {
      clinicianUsername, // Preserve original case
      customerEmail,     // Preserve original case for the JSON output
      requestDate,
      status: "pending"
    };

    if (existingIndex !== -1) {
      requests[existingIndex] = newRequest;
    } else {
      requests.push(newRequest);
    }
    
    await kvSet(key, requests);
    
    // Read back the value to confirm it includes the new clinician
    const checkRequests = (await kvGet<ClinicianAccessRequest[]>(key)) || [];
    const found = checkRequests.some(
      req => req.clinicianUsername.toLowerCase() === clinicianUsername.toLowerCase()
    );
    
    if (found) {
      success = true;
    } else {
      attempts++;
      // Give the competing request time to finish before retrying
      await new Promise(resolve => setTimeout(resolve, 50 * attempts));
    }
  }
}

export async function getClinicianAccessRequests(customerEmail: string): Promise<ClinicianAccessRequest[]> {
  const normalizedEmail = decodeURIComponent(customerEmail).trim().toLowerCase();
  const key = `clinicianAccessRequests:${normalizedEmail}`;
  const requests = await kvGet<ClinicianAccessRequest[]>(key);
  return requests || [];
}

export async function deleteClinicianAccessRequest(customerEmail: string, clinicianUsername: string): Promise<boolean> {
  const normalizedEmail = decodeURIComponent(customerEmail).trim().toLowerCase();
  const key = `clinicianAccessRequests:${normalizedEmail}`;
  let requests: ClinicianAccessRequest[] = (await kvGet<ClinicianAccessRequest[]>(key)) || [];
  
  const initialLength = requests.length;
  requests = requests.filter(req => req.clinicianUsername.toLowerCase() !== clinicianUsername.toLowerCase());
  
  if (requests.length === initialLength) {
    // No request was removed
    return false;
  }
  
  await kvSet(key, requests);
  return true;
}
