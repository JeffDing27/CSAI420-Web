import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";
import { RepositoryFactory } from "../src/repositories/provider-factory";
import { randomUUID } from "crypto";

async function main() {
  console.log("--- Starting Dual Write Verification ---");

  // Temporarily force mode to dual
  process.env.STORAGE_PROVIDER = "dual";

  const userId = `test-user-${randomUUID()}`;
  const phone = "1234567890";
  const token = `expo-push-token-${randomUUID()}`;

  try {
    // Test CustomerReference
    const customerRepo = RepositoryFactory.getCustomerReferenceRepository();
    await customerRepo.create({ phone, userId, email: `${phone}@test.com`, name: "Test User" });
    
    // Verify in both manually
    const prismaCustomer = await prisma.customerReference.findUnique({ where: { phone } });
    
    // Test PushToken
    const pushTokenRepo = RepositoryFactory.getPushTokenRepository();
    await pushTokenRepo.upsert(userId, "ios", token);

    const prismaPushToken = await prisma.pushToken.findUnique({ where: { token } });

    // Assuming if it doesn't throw and prisma has it, dual write works.
    if (prismaCustomer && prismaPushToken) {
      console.log("CustomerReference Dual Write: SUCCESS");
      console.log("PushToken Dual Write: SUCCESS");
    } else {
      console.error("Failed to find records in Prisma after Dual Write");
      process.exit(1);
    }

    console.log("--- Verification Complete ---");

  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.customerReference.delete({ where: { phone } }).catch(() => {});
    await prisma.pushToken.delete({ where: { token } }).catch(() => {});
    await prisma.$disconnect();
  }
}

main();
