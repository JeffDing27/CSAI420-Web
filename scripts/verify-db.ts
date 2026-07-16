import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

async function verify() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL });

  try {
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const enumRes = await pool.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `);

    const indexRes = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);

    const fkRes = await pool.query(`
      SELECT conname, conrelid::regclass AS table_from
      FROM pg_constraint 
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    `);

    let history = [];
    try {
      const histRes = await pool.query("SELECT * FROM _prisma_migrations");
      history = histRes.rows;
    } catch (e) {
      console.log("_prisma_migrations table does not exist");
    }

    const applicationTables = [
      "User",
      "AuthSession",
      "CustomerReference",
      "Consent",
      "ConsentedClinician",
      "ClinicianAccessRequest",
      "RapidStepTest",
      "Escalation",
      "CoachResponse",
      "ChatSession",
      "ChatMessage",
      "PushToken",
      "VoiceSession",
      "VoiceTest",
      "SmsConsentMessage",
      "OutboxEvent",
      "RagDocument",
      "RagChunk",
      "AuditEvent",
    ];

    const tablesWithData = [];
    for (const tableName of tableRes.rows.map((r) => r.table_name)) {
      if (applicationTables.includes(tableName)) {
        const countRes = await pool.query(
          `SELECT COUNT(*) FROM "${tableName}"`,
        );
        if (parseInt(countRes.rows[0].count, 10) > 0) {
          tablesWithData.push(tableName);
        }
      }
    }

    console.log("=== DB STATE INVENTORY ===");
    console.log(
      "Tables:",
      tableRes.rows.map((r) => r.table_name),
    );
    console.log(
      "Enums:",
      enumRes.rows.map((r) => r.typname),
    );
    console.log(
      "Indexes:",
      indexRes.rows.map((r) => r.indexname),
    );
    console.log(
      "Foreign Keys:",
      fkRes.rows.map((r) => r.conname),
    );
    console.log(
      "Prisma Migrations:",
      history.map((h) => ({
        id: h.id,
        migration_name: h.migration_name,
        finished_at: h.finished_at,
        rolled_back_at: h.rolled_back_at,
      })),
    );
    console.log("Application Tables with Data:", tablesWithData);
  } catch (err) {
    console.error(`ERROR:`, err);
  } finally {
    await pool.end();
  }
}

verify();
