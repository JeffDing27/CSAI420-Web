import { config } from "dotenv";
import { loadEnvConfig } from "@next/env";
import { afterAll } from "vitest";
import { resetKvFallback } from "@/utils/kv-store";

// Ensure local env vars are available in test runtime for Prisma/PG.
config({ path: ".env.local", override: true });

// Avoid global .env leakage into tests that expect explicit mode control.
process.env.USE_LOCAL_USER_STORE = "false";

// Load Next.js-style env resolution as a fallback.
loadEnvConfig(process.cwd());

afterAll(() => {
  resetKvFallback();
});
