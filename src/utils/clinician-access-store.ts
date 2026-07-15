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
  await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: valString
  });
}

// Graceful fallback for local testing if KV env vars are not set
const globalForFallback = globalThis as unknown as { __fallbackStore: Map<string, any> };
const globalFallbackStore = globalForFallback.__fallbackStore ?? new Map<string, any>();
if (process.env.NODE_ENV !== "production") {
  globalForFallback.__fallbackStore = globalFallbackStore;
}

export async function addClinicianAccessRequest(customerEmail: string, clinicianUsername: string): Promise<void> {
  const normalizedEmail = customerEmail.toLowerCase();
  const key = `clinicianAccessRequests:${normalizedEmail}`;
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
    // Replace the existing one, but keep everything else the same (i.e. status goes back to pending)
    requests[existingIndex] = newRequest;
  } else {
    requests.push(newRequest);
  }
  
  await kvSet(key, requests);
}

export async function getClinicianAccessRequests(customerEmail: string): Promise<ClinicianAccessRequest[]> {
  const normalizedEmail = customerEmail.toLowerCase();
  const key = `clinicianAccessRequests:${normalizedEmail}`;
  const requests = await kvGet<ClinicianAccessRequest[]>(key);
  return requests || [];
}

export async function deleteClinicianAccessRequest(customerEmail: string, clinicianUsername: string): Promise<boolean> {
  const normalizedEmail = customerEmail.toLowerCase();
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
