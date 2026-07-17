import type { Prisma } from "@prisma/client";

export function normalizeJson(
  value: any,
  seen = new WeakSet(),
): Prisma.InputJsonValue {
  if (value === null) return null as unknown as Prisma.InputJsonValue;
  if (value === undefined)
    throw new Error("JSON normalization rejects undefined");
  if (typeof value === "function")
    throw new Error("JSON normalization rejects functions");
  if (typeof value === "symbol")
    throw new Error("JSON normalization rejects symbols");
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (typeof value !== "object") return value as Prisma.InputJsonValue;

  if (seen.has(value))
    throw new Error("JSON normalization rejects cyclic objects");
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) =>
      normalizeJson(item, seen),
    ) as Prisma.InputJsonArray;
  }

  const result: any = {};
  for (const key of Object.keys(value)) {
    const val = value[key];
    if (
      val !== undefined &&
      typeof val !== "function" &&
      typeof val !== "symbol"
    ) {
      result[key] = normalizeJson(val, seen);
    }
  }
  return result as Prisma.InputJsonObject;
}
