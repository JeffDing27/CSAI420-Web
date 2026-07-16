import { kvGet, kvSet } from "@/utils/kv-store";
import type { ConsentedClinician } from "@prisma/client";
import crypto from "crypto";
import type { ConsentedClinicianRepository } from "../interfaces";

export class KvConsentedClinicianRepository implements ConsentedClinicianRepository {
  async findByCustomer(customer: string): Promise<ConsentedClinician[]> {
    const data = await kvGet<string[]>(`consentedClinicians:${customer}`);
    if (!data) return [];
    
    return data.map((clinicianUsername) => ({
      id: crypto.randomUUID(), // KV implementation didn't store full object
      customer,
      clinicianUsername,
      createdAt: new Date(),
    }));
  }

  async add(
    customer: string,
    clinicianUsername: string,
  ): Promise<ConsentedClinician> {
    const list = await kvGet<string[]>(`consentedClinicians:${customer}`) || [];
    if (!list.includes(clinicianUsername)) {
      list.push(clinicianUsername);
      await kvSet(`consentedClinicians:${customer}`, list);
    }

    return {
      id: crypto.randomUUID(),
      customer,
      clinicianUsername,
      createdAt: new Date(),
    };
  }
}
