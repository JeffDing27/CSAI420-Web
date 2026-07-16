import { loadEnvConfig } from "@next/env";
import { afterAll, beforeAll } from "vitest";
import { resetKvFallback } from "@/utils/kv-store";

beforeAll(() => {
  loadEnvConfig(process.cwd());
});

afterAll(() => {
  resetKvFallback();
});
