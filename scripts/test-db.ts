import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

async function testConnection(
  name: string,
  connectionString: string | undefined,
) {
  if (!connectionString) {
    console.error(`ERROR: ${name} is not set.`);
    return;
  }

  // Create a pool instead of simple client to test typical connection behavior
  const pool = new Pool({ connectionString });

  try {
    console.log(`Testing ${name}...`);
    const res = await pool.query(
      "SELECT 1 as result, current_database() as db, current_user as user",
    );
    console.log(
      `SUCCESS: Connected to ${name} (db: ${res.rows[0].db}, user: ${res.rows[0].user})`,
    );

    // Also check if public schema has tables
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    console.log(
      `Tables in public schema for ${name}:`,
      tableRes.rows.map((r) => r.table_name).join(", ") || "None",
    );
  } catch (err) {
    console.error(`ERROR connecting to ${name}:`, err);
  } finally {
    await pool.end();
  }
}

async function run() {
  await testConnection("DATABASE_URL", process.env.DATABASE_URL);
  await testConnection("DIRECT_URL", process.env.DIRECT_URL);
}

run();
