import type { CustomerReference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CustomerReferenceRepository } from "../interfaces";

export class PrismaCustomerReferenceRepository
  implements CustomerReferenceRepository
{
  async findById(id: string): Promise<CustomerReference | null> {
    return prisma.customerReference.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<CustomerReference | null> {
    return prisma.customerReference.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<CustomerReference | null> {
    return prisma.customerReference.findUnique({ where: { phone } });
  }

  async create(
    customer: Omit<CustomerReference, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomerReference> {
    return prisma.customerReference.create({ data: customer });
  }

  async update(
    id: string,
    customer: Partial<CustomerReference>,
  ): Promise<CustomerReference> {
    return prisma.customerReference.update({ where: { id }, data: customer });
  }
}
