import fs from "fs";
import path from "path";

const file = path.join(
  "prisma/migrations/20260716113020_initial_supabase_schema/migration.sql",
);
let content = fs.readFileSync(file, "utf8");

// Remove anything before the first "-- CreateTable" or "CREATE "
const match = content.match(/(-- CreateTable|CREATE )/i);
if (match && match.index !== undefined) {
  content = content.substring(match.index);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed migration.sql');
} else {
  console.log("Could not find CREATE statement");
}
