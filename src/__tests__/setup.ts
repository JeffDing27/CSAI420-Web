import { loadEnvConfig } from "@next/env";
import { afterAll } from "vitest";
import { resetKvFallback } from "@/utils/kv-store";

// Load environment variables immediately before any imports resolve
loadEnvConfig(process.cwd());

afterAll(() => {
  resetKvFallback();
});
