import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

async function verify() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL });

  try {
    const histRes = await pool.query("SELECT * FROM _prisma_migrations");
    console.log(
      "Prisma Migrations:",
      histRes.rows.map((h) => ({
        id: h.id,
        migration_name: h.migration_name,
        finished_at: h.finished_at,
        rolled_back_at: h.rolled_back_at,
        checksum: h.checksum,
      })),
    );
  } catch (err) {
    console.error(`ERROR:`, err);
  } finally {
    await pool.end();
  }
}

verify();
