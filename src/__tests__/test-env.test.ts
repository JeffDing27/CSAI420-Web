import { expect, test } from "vitest";

test("env vars", () => {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("DIRECT_URL:", process.env.DIRECT_URL);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  expect(true).toBe(true);
});
