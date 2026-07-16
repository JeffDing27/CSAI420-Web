import { kvGet, kvSet } from "@/utils/kv-store";
import type { Consent } from "@prisma/client";
import crypto from "crypto";
import type { ConsentRepository } from "../interfaces";

export class KvConsentRepository implements ConsentRepository {
  async findByCustomer(customer: string): Promise<Consent | null> {
    const value = await kvGet<boolean>(`consent:${customer}`);
    if (value === null) return null;

    return {
      id: "kv-mock-id", // KV implementation didn't store full object
      customer,
      status: value,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async upsert(customer: string, status: boolean): Promise<Consent> {
    await kvSet(`consent:${customer}`, status);

    return {
      id: crypto.randomUUID(),
      customer,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
