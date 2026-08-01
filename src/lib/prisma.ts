import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

function normalizeSupabaseConnectionString(value: string) {
  if (!value || value === "undefined") {
    return "postgresql://localhost:5432/stedi_test";
  }
  const url = new URL(value);
  const directMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);

  if (directMatch) {
    const projectRef = directMatch[1];
    url.hostname = "aws-1-us-west-2.pooler.supabase.com";
    url.port = "6543";
    url.username = `postgres.${projectRef}`;
    url.searchParams.set("pgbouncer", "true");
    url.searchParams.set("connection_limit", "1");
  }

  return url.toString();
}

const prismaClientSingleton = () => {
  const configuredConnectionString =
    process.env.NODE_ENV === "test"
      ? `${process.env.DIRECT_URL}`
      : `${process.env.DATABASE_URL}`;
  const connectionString = normalizeSupabaseConnectionString(
    configuredConnectionString,
  );

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

