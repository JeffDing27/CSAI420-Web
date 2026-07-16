import type { ConsentedClinician } from "@prisma/client";
import type { ConsentedClinicianRepository } from "../interfaces";
import { KvConsentedClinicianRepository } from "../kv/consented-clinician-repository";
import { PrismaConsentedClinicianRepository } from "../prisma/consented-clinician-repository";

export class DualConsentedClinicianRepository implements ConsentedClinicianRepository {
  private prismaRepo = new PrismaConsentedClinicianRepository();
  private kvRepo = new KvConsentedClinicianRepository();

  async findByCustomer(customer: string): Promise<ConsentedClinician[]> {
    return this.prismaRepo.findByCustomer(customer);
  }

  async add(
    customer: string,
    clinicianUsername: string,
  ): Promise<ConsentedClinician> {
    // Write to Supabase first
    const clinician = await this.prismaRepo.add(customer, clinicianUsername);

    // Secondary write to KV
    this.kvRepo.add(customer, clinicianUsername).catch((e) => {
      console.error(
        "Failed secondary write to KV for consented clinician:",
        customer,
        clinicianUsername,
        e,
      );
    });

    return clinician;
  }
}
