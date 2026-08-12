import type { ClinicianAccessRequest } from "@prisma/client";
import { RepositoryFactory } from "@/repositories/provider-factory";

export class ClinicianAccessRequestService {
  private repo = RepositoryFactory.getClinicianAccessRequestRepository();

  async getRequests(customerEmail: string): Promise<ClinicianAccessRequest[]> {
    return this.repo.findByCustomer(customerEmail);
  }

  async addRequest(
    customerEmail: string,
    clinicianUsername: string,
  ): Promise<ClinicianAccessRequest> {
    return this.repo.create({
      customerEmail,
      clinicianUsername,
      status: "pending",
      requestDate: new Date(),
    });
  }

  async getRequestById(id: string): Promise<ClinicianAccessRequest | null> {
    return this.repo.findById(id);
  }

  async getRequestsForClinician(
    clinicianUsername: string,
  ): Promise<ClinicianAccessRequest[]> {
    return this.repo.findByClinicianUsername(clinicianUsername);
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<ClinicianAccessRequest> {
    return this.repo.updateStatus(id, status);
  }

  async deleteRequest(
    customerEmail: string,
    clinicianUsername: string,
  ): Promise<boolean> {
    return this.repo.delete(customerEmail, clinicianUsername);
  }
}
