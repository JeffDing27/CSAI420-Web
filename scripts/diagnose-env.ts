import { config } from "dotenv";

config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL || "";
const directUrl = process.env.DIRECT_URL || "";

console.log("DATABASE_URL present:", !!dbUrl);
console.log("DIRECT_URL present:", !!directUrl);

try {
  if (dbUrl) {
    const dbParsed = new URL(dbUrl);
    console.log("DATABASE_URL parsed port:", dbParsed.port);
    console.log(
      "Runtime URL contains expected pooler hostname pattern (pooler.supabase.com):",
      dbParsed.hostname.includes("pooler.supabase.com"),
    );
    console.log(
      "Transaction URL has pgbouncer=true:",
      dbParsed.searchParams.get("pgbouncer") === "true",
    );
  }
} catch (e) {
  console.log("DATABASE_URL invalid format");
}

try {
  if (directUrl) {
    const directParsed = new URL(directUrl);
    console.log("DIRECT_URL parsed port:", directParsed.port);
  }
} catch (e) {
  console.log("DIRECT_URL invalid format");
}
