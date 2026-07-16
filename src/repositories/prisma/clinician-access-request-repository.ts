import { prisma } from "@/lib/prisma";
import type { ClinicianAccessRequest } from "@prisma/client";
import type { ClinicianAccessRequestRepository } from "../interfaces";

export class PrismaClinicianAccessRequestRepository implements ClinicianAccessRequestRepository {
  async findByCustomer(customerEmail: string): Promise<ClinicianAccessRequest[]> {
    return prisma.clinicianAccessRequest.findMany({
      where: { customerEmail },
    });
  }

  async create(
    request: Omit<ClinicianAccessRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<ClinicianAccessRequest> {
    return prisma.clinicianAccessRequest.create({
      data: request,
    });
  }

  async updateStatus(id: string, status: string): Promise<ClinicianAccessRequest> {
    return prisma.clinicianAccessRequest.update({
      where: { id },
      data: { status },
    });
  }

  async delete(customerEmail: string, clinicianUsername: string): Promise<boolean> {
    const deleted = await prisma.clinicianAccessRequest.deleteMany({
      where: { customerEmail, clinicianUsername },
    });
    return deleted.count > 0;
  }
}
