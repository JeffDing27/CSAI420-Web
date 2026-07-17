import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.NODE_ENV === "test" 
    ? `${process.env.DIRECT_URL}` 
    : `${process.env.DATABASE_URL}`;

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production" ||
      connectionString.includes("supabase")
        ? { rejectUnauthorized: false }
        : undefined,
  });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
