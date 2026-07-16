import type { CustomerReference } from "@prisma/client";
import type { CustomerReferenceRepository } from "../interfaces";
import { PrismaCustomerReferenceRepository } from "../prisma/customer-reference-repository";
import { KvCustomerReferenceRepository } from "../kv/customer-reference-repository";

export class DualCustomerReferenceRepository implements CustomerReferenceRepository {
  private prismaRepo = new PrismaCustomerReferenceRepository();
  private kvRepo = new KvCustomerReferenceRepository();

  async findById(id: string): Promise<CustomerReference | null> {
    return this.prismaRepo.findById(id);
  }

  async findByEmail(email: string): Promise<CustomerReference | null> {
    return this.prismaRepo.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<CustomerReference | null> {
    return this.prismaRepo.findByPhone(phone);
  }

  async create(
    customer: Omit<CustomerReference, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomerReference> {
    const created = await this.prismaRepo.create(customer);
    try {
      await this.kvRepo.create({ ...customer, userId: created.userId });
    } catch (e) {
      console.warn("Failed KV secondary write", e);
    }
    return created;
  }

  async update(
    id: string,
    customer: Partial<CustomerReference>,
  ): Promise<CustomerReference> {
    const updated = await this.prismaRepo.update(id, customer);
    try {
      await this.kvRepo.update(id, customer);
    } catch (e) {
      console.warn("Failed KV secondary update", e);
    }
    return updated;
  }
}
