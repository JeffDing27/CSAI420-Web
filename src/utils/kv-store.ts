export async function kvGet<T>(key: string): Promise<T | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "KV_REST_API_URL or KV_REST_API_TOKEN is missing. Please add them in Vercel.",
      );
    }
    return (globalFallbackStore.get(key) as T | null) || null;
  }

  try {
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (data.result === null || data.result === undefined) return null;

    try {
      return JSON.parse(data.result) as T;
    } catch (e) {
      return data.result as T;
    }
  } catch (e) {
    console.error(`KV GET Error for key ${key}:`, e);
    return null;
  }
}

export async function kvSet(key: string, value: any): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    globalFallbackStore.set(key, value);
    return;
  }

  const valString = typeof value === "string" ? value : JSON.stringify(value);
  try {
    const res = await fetch(`${url}/set/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: valString,
    });

    // Make sure KV write is fully awaited
    await res.text();
  } catch (e) {
    console.error(`KV SET Error for key ${key}:`, e);
  }
}

// Graceful fallback for local testing if KV env vars are not set
const globalForFallback = globalThis as unknown as {
  __fallbackStore: Map<string, any>;
};
const globalFallbackStore =
  globalForFallback.__fallbackStore ?? new Map<string, any>();
if (process.env.NODE_ENV !== "production") {
  globalForFallback.__fallbackStore = globalFallbackStore;
}

export function resetKvFallback() {
  globalFallbackStore.clear();
}

export async function kvDelete(key: string): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    globalFallbackStore.delete(key);
    return;
  }

  try {
    const res = await fetch(`${url}/del/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    await res.text();
  } catch (e) {
    console.error(`KV DELETE Error for key ${key}:`, e);
  }
}
