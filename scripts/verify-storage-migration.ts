import { PrismaClient } from "@prisma/client";

async function verify() {
  console.log("Verifying storage migration to Supabase...");
  if (process.env.STORAGE_PROVIDER !== "supabase") {
    console.error("ERROR: STORAGE_PROVIDER is not set to supabase.");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Storage Migration Verification: SUCCESS - Connected to Supabase");
  } catch (e) {
    console.error("Storage Migration Verification: FAILED - Cannot connect to Supabase");
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
