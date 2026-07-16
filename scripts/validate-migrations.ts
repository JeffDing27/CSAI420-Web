import fs from "fs";
import path from "path";

const migrationsDir = "prisma/migrations";
if (fs.existsSync(migrationsDir)) {
  const folders = fs
    .readdirSync(migrationsDir)
    .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory());

  for (const folder of folders) {
    const file = path.join(migrationsDir, folder, "migration.sql");
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      if (buf.includes(0)) {
        console.error("VALIDATION FAILED: Null byte found in " + file);
        process.exit(1);
      }
    }
  }
  console.log("Migration encoding validation passed.");
}
