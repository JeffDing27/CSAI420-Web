import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const destFolder = "prisma/migrations/20260716113020_initial_supabase_schema";
const duplicateFolder =
  "prisma/migrations/20260716113046_initial_supabase_schema";
const destFile = path.join(destFolder, "migration.sql");

try {
  console.log("Generating migration SQL via Prisma CLI...");
  const stdout = execSync(
    "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
    { encoding: "utf8" },
  );

  if (stdout.includes("\0")) {
    console.error("FAILED: Null byte found in generated SQL");
    process.exit(1);
  }

  // Check for destructive SQL
  const destructiveMatch = stdout.match(
    /(DROP|TRUNCATE|DELETE\s|ALTER\s+TABLE.*DROP)/i,
  );
  if (destructiveMatch) {
    if (destructiveMatch.index !== undefined) {
      console.error(
        "Destructive statement found (DROP/DELETE/TRUNCATE). Aborting.",
      );
      console.error(
        "In line:",
        stdout.substring(
          Math.max(0, destructiveMatch.index - 50),
          destructiveMatch.index + 50,
        ),
      );
    } else {
      console.error(
        "Destructive statement found (DROP/DELETE/TRUNCATE). Aborting.",
      );
    }
    process.exit(1);
  }

  // Write as UTF-8
  fs.writeFileSync(destFile, stdout, "utf8");
  console.log(`Successfully repaired ${destFile}`);

  // Remove duplicate folder
  if (fs.existsSync(duplicateFolder)) {
    fs.rmSync(duplicateFolder, { recursive: true, force: true });
    console.log(`Removed duplicate folder ${duplicateFolder}`);
  }
} catch (e) {
  console.error("ERROR:", e);
  process.exit(1);
}
