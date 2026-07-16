import type { Consent } from "@prisma/client";
import type { ConsentRepository } from "../interfaces";
import { KvConsentRepository } from "../kv/consent-repository";
import { PrismaConsentRepository } from "../prisma/consent-repository";

export class DualConsentRepository implements ConsentRepository {
  private prismaRepo = new PrismaConsentRepository();
  private kvRepo = new KvConsentRepository();

  async findByCustomer(customer: string): Promise<Consent | null> {
    return this.prismaRepo.findByCustomer(customer);
  }

  async upsert(customer: string, status: boolean): Promise<Consent> {
    // Write to Supabase first
    const consent = await this.prismaRepo.upsert(customer, status);

    // Secondary write to KV
    this.kvRepo.upsert(customer, status).catch((e) => {
      console.error(
        "Failed secondary write to KV for consent:",
        customer,
        e,
      );
    });

    return consent;
  }
}
