export interface ClinicianConsent {
  clinicianUsername: string;
  consentExpirationDate: string;
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

export async function setConsent(customer: string, value: boolean) {
  await kvSet(`consent:${customer}`, value ? "true" : "false");
}

export async function getConsent(customer: string): Promise<boolean> {
  const value = await kvGet<string>(`consent:${customer}`);
  return value === "true";
}

export async function setConsentedClinician(customer: string, clinicianUsername: string) {
  const key = `clinicians:${customer}`;
  let clinicians: ClinicianConsent[] = (await kvGet<ClinicianConsent[]>(key)) || [];
  
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  
  const formattedDate = expirationDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  const existingIndex = clinicians.findIndex(c => c.clinicianUsername === clinicianUsername);
  if (existingIndex !== -1) {
    clinicians[existingIndex].consentExpirationDate = formattedDate;
  } else {
    clinicians.push({
      clinicianUsername,
      consentExpirationDate: formattedDate
    });
  }
  
  await kvSet(key, clinicians);
}

export async function getConsentedClinicians(customer: string): Promise<ClinicianConsent[]> {
  const key = `clinicians:${customer}`;
  const clinicians = await kvGet<ClinicianConsent[]>(key);
  return clinicians || [];
}
