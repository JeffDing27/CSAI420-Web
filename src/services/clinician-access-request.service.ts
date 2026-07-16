import { RepositoryFactory } from "@/repositories/provider-factory";
import type { ClinicianAccessRequest } from "@prisma/client";

export class ClinicianAccessRequestService {
  private repo = RepositoryFactory.getClinicianAccessRequestRepository();

  async getRequests(customerEmail: string): Promise<ClinicianAccessRequest[]> {
    return this.repo.findByCustomer(customerEmail);
  }

  async addRequest(customerEmail: string, clinicianUsername: string): Promise<ClinicianAccessRequest> {
    return this.repo.create({
      customerEmail,
      clinicianUsername,
      status: "pending",
      requestDate: new Date(),
    });
  }

  async deleteRequest(customerEmail: string, clinicianUsername: string): Promise<boolean> {
    return this.repo.delete(customerEmail, clinicianUsername);
  }
}
