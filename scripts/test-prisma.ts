import { prisma } from "../src/lib/prisma";

async function testPrisma() {
  console.log("Testing Prisma connection...");
  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.log("Prisma connection SUCCESS! Found users:", users.length);
  } catch (e) {
    console.error("Prisma connection FAILED:");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
