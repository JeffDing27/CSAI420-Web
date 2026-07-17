import type { Consent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ConsentRepository } from "../interfaces";

export class PrismaConsentRepository implements ConsentRepository {
  async findByCustomer(customer: string): Promise<Consent | null> {
    return prisma.consent.findUnique({ where: { customer } });
  }

  async upsert(customer: string, status: boolean): Promise<Consent> {
    return prisma.consent.upsert({
      where: { customer },
      update: { status },
      create: { customer, status },
    });
  }
}
