import { prisma } from "@/lib/prisma";
import type { ConsentedClinician } from "@prisma/client";
import type { ConsentedClinicianRepository } from "../interfaces";

export class PrismaConsentedClinicianRepository implements ConsentedClinicianRepository {
  async findByCustomer(customer: string): Promise<ConsentedClinician[]> {
    return prisma.consentedClinician.findMany({
      where: { customer },
    });
  }

  async add(
    customer: string,
    clinicianUsername: string,
  ): Promise<ConsentedClinician> {
    return prisma.consentedClinician.upsert({
      where: { customer_clinicianUsername: { customer, clinicianUsername } },
      update: {},
      create: { customer, clinicianUsername },
    });
  }
}
