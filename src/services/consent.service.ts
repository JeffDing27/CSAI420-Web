import { RepositoryFactory } from "@/repositories/provider-factory";

export class ConsentService {
  private repo = RepositoryFactory.getConsentRepository();

  async getConsent(customer: string): Promise<boolean> {
    const consent = await this.repo.findByCustomer(customer);
    return consent ? consent.status : false;
  }

  async setConsent(customer: string, status: boolean): Promise<void> {
    await this.repo.upsert(customer, status);
  }
}
