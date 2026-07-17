import type { ConsentedClinician } from "@prisma/client";
import { RepositoryFactory } from "@/repositories/provider-factory";

export class ConsentedClinicianService {
  private repo = RepositoryFactory.getConsentedClinicianRepository();

  async getConsentedClinicians(
    customer: string,
  ): Promise<{ clinicianUsername: string }[]> {
    const clinicians = await this.repo.findByCustomer(customer);
    return clinicians.map((c) => ({ clinicianUsername: c.clinicianUsername }));
  }

  async addConsentedClinician(
    customer: string,
    clinicianUsername: string,
  ): Promise<void> {
    await this.repo.add(customer, clinicianUsername);
  }
}
