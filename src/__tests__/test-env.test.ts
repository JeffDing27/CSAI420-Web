import { expect, test } from "vitest";

test("env vars", () => {
  expect(Boolean(process.env.DATABASE_URL)).toBe(true);
  expect(Boolean(process.env.DIRECT_URL)).toBe(true);
  console.log("NODE_ENV:", process.env.NODE_ENV);
});
