// Dry-run migration script from KV to Supabase

import { randomUUID } from "crypto";
import { prisma } from "../src/lib/prisma";
import { kvGet } from "../src/utils/kv-store";

// Execute in dry-run by default unless passed `--execute`
const isDryRun = !process.argv.includes("--execute");

async function migrateUsers() {
  console.log("Migrating Users...");

  // Note: KV REST API doesn't provide a list of keys easily.
  // We'll need the user to export keys from Vercel KV or iterate known users.
  // For the script, we assume we have a list of user emails.
  const knownEmails = ["test@example.com"]; // Placeholder

  let migrated = 0;
  for (const email of knownEmails) {
    const key = `user:${email.toLowerCase()}`;
    const kvUser = await kvGet<any>(key);

    if (kvUser) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would migrate user ${email}`);
      } else {
        await prisma.user.upsert({
          where: { email: email.toLowerCase() },
          update: {
            firstName: kvUser.firstName || "",
            lastName: kvUser.lastName || "",
            phone: kvUser.phone || "",
            birthDate: kvUser.birthDate || "",
            passwordHash: kvUser.password || "",
            passwordSalt: kvUser.salt || "",
          },
          create: {
            id: randomUUID(),
            userName: email.toLowerCase(),
            email: email.toLowerCase(),
            firstName: kvUser.firstName || "",
            lastName: kvUser.lastName || "",
            phone: kvUser.phone || "",
            birthDate: kvUser.birthDate || "",
            region: kvUser.region || "US",
            passwordHash: kvUser.password || "",
            passwordSalt: kvUser.salt || "",
          },
        });
        console.log(`Migrated user ${email}`);
      }
      migrated++;
    }
  }

  console.log(`Completed migrating ${migrated} users.`);
}

async function main() {
  console.log(
    `Starting KV to Supabase migration script... (Dry Run: ${isDryRun})`,
  );

  if (!process.env.DATABASE_URL && !isDryRun) {
    console.error("DATABASE_URL is not set. Aborting migration.");
    process.exit(1);
  }

  try {
    await migrateUsers();
    // Add other entities here
  } catch (e) {
    console.error("Migration failed:", e);
  }
}

main();
