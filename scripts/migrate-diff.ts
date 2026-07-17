import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "child_process";

try {
  console.log("Running prisma migrate diff...");
  execSync(`npx prisma migrate diff --from-url "${process.env.DIRECT_URL}" --to-schema prisma/schema.prisma --script > add_role.sql`, { stdio: 'inherit' });
  console.log("Done.");
} catch (e) {
  console.error(e);
}
