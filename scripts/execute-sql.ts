import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "child_process";

try {
  console.log("Running prisma db execute...");
  execSync(`npx prisma db execute --file add_role.sql`, { stdio: 'inherit', env: { ...process.env, PRISMA_DB_URL: process.env.DIRECT_URL } });
  console.log("Done.");
} catch (e) {
  console.error(e);
}
