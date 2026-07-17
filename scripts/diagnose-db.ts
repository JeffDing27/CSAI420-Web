import { config } from "dotenv";

config({ path: ".env.local" });

import { Pool } from "pg";

async function testConnection(url: string, name: string) {
  if (!url) {
    console.log(`${name}: URL not provided`);
    return;
  }

  const parsed = new URL(url);
  const port = parsed.port;

  // Try to connect with pg pool
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log(`${name}: connection succeeded`);
    console.log(`${name} parsed port:`, port);
  } catch (error: any) {
    console.log(`${name}: connection failed`);
    console.log(`${name} parsed port:`, port);
    console.log(`error code:`, error.code || "UNKNOWN");
    console.log(
      `error category:`,
      error.message ? error.message.substring(0, 50) : "Unknown error",
    );
  } finally {
    await pool.end();
  }
}

async function main() {
  await testConnection(process.env.DATABASE_URL || "", "DATABASE_URL");
  await testConnection(process.env.DIRECT_URL || "", "DIRECT_URL");
}

main().catch((e) => console.error(e));
