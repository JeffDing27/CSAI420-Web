import type { ClinicianAccessRequest } from "@prisma/client";
import type { ClinicianAccessRequestRepository } from "../interfaces";
import { KvClinicianAccessRequestRepository } from "../kv/clinician-access-request-repository";
import { PrismaClinicianAccessRequestRepository } from "../prisma/clinician-access-request-repository";

export class DualClinicianAccessRequestRepository implements ClinicianAccessRequestRepository {
  private prismaRepo = new PrismaClinicianAccessRequestRepository();
  private kvRepo = new KvClinicianAccessRequestRepository();

  async findByCustomer(customerEmail: string): Promise<ClinicianAccessRequest[]> {
    return this.prismaRepo.findByCustomer(customerEmail);
  }

  async create(
    request: Omit<ClinicianAccessRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<ClinicianAccessRequest> {
    const created = await this.prismaRepo.create(request);

    this.kvRepo.create({ ...request }).catch((e) => {
      console.error(
        "Failed secondary write to KV for clinician access request:",
        request.customerEmail,
        request.clinicianUsername,
        e,
      );
    });

    return created;
  }

  async updateStatus(id: string, status: string): Promise<ClinicianAccessRequest> {
    // Only Prisma stores accurate IDs easily
    return this.prismaRepo.updateStatus(id, status);
  }

  async delete(customerEmail: string, clinicianUsername: string): Promise<boolean> {
    const deleted = await this.prismaRepo.delete(customerEmail, clinicianUsername);

    this.kvRepo.delete(customerEmail, clinicianUsername).catch((e) => {
      console.error(
        "Failed secondary delete to KV for clinician access request:",
        customerEmail,
        clinicianUsername,
        e,
      );
    });

    return deleted;
  }
}
