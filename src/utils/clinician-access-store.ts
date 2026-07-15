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

async function kvHSet(key: string, field: string, value: any): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const valString = typeof value === 'string' ? value : JSON.stringify(value);
  
  if (!url || !token) {
    let hash = globalFallbackStore.get(key) || {};
    hash[field] = valString;
    globalFallbackStore.set(key, hash);
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(["HSET", key, field, valString])
  });
  await res.text();
}

async function kvHGetAll<T>(key: string): Promise<T[]> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    let hash = globalFallbackStore.get(key) || {};
    return Object.values(hash).map((val: any) => {
      try { return JSON.parse(val); } catch(e) { return val; }
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(["HGETALL", key]),
    cache: 'no-store'
  });
  const data = await res.json();
  
  const result = data.result || [];
  const parsed: T[] = [];
  
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) {
      const val = result[i+1];
      try {
        parsed.push(JSON.parse(val));
      } catch (e) {
        parsed.push(val as T);
      }
    }
  } else if (typeof result === 'object') {
    for (const val of Object.values(result)) {
      try {
        parsed.push(JSON.parse(val as string));
      } catch (e) {
        parsed.push(val as T);
      }
    }
  }
  
  return parsed;
}

async function kvHDel(key: string, field: string): Promise<boolean> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    let hash = globalFallbackStore.get(key);
    if (hash && hash[field]) {
      delete hash[field];
      globalFallbackStore.set(key, hash);
      return true;
    }
    return false;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(["HDEL", key, field])
  });
  const data = await res.json();
  return data.result > 0;
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
  
  const key = `clinicianAccessRequests:${normalizedEmail}`;
  const field = normalizedClinician;
  
  const requestDate = new Date().toISOString();
  
  const newRequest: ClinicianAccessRequest = {
    clinicianUsername, // Preserve original case
    customerEmail,     // Preserve original case for the JSON output
    requestDate,
    status: "pending"
  };

  await kvHSet(key, field, newRequest);
}

export async function getClinicianAccessRequests(customerEmail: string): Promise<ClinicianAccessRequest[]> {
  const normalizedEmail = decodeURIComponent(customerEmail).trim().toLowerCase();
  const key = `clinicianAccessRequests:${normalizedEmail}`;
  
  const requests = await kvHGetAll<ClinicianAccessRequest>(key);
  return requests;
}

export async function deleteClinicianAccessRequest(customerEmail: string, clinicianUsername: string): Promise<boolean> {
  const normalizedEmail = decodeURIComponent(customerEmail).trim().toLowerCase();
  const normalizedClinician = clinicianUsername.trim().toLowerCase();
  
  const key = `clinicianAccessRequests:${normalizedEmail}`;
  const field = normalizedClinician;
  
  return await kvHDel(key, field);
}
