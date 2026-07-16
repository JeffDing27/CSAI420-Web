import type { CustomerReference } from "@prisma/client";
import type { CustomerReferenceRepository } from "../interfaces";
import { kvGet, kvSet } from "../../utils/kv-store";
import { randomUUID } from "crypto";

export class KvCustomerReferenceRepository implements CustomerReferenceRepository {
  private getPrefix = "customer-ref";

  async findById(id: string): Promise<CustomerReference | null> {
    return kvGet<CustomerReference>(`${this.getPrefix}:id:${id}`);
  }

  async findByEmail(email: string): Promise<CustomerReference | null> {
    return kvGet<CustomerReference>(`${this.getPrefix}:email:${email}`);
  }

  async findByPhone(phone: string): Promise<CustomerReference | null> {
    return kvGet<CustomerReference>(`${this.getPrefix}:phone:${phone}`);
  }

  async create(
    customer: Omit<CustomerReference, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomerReference> {
    const id = randomUUID();
    const newCustomer = {
      ...customer,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CustomerReference;

    await kvSet(`${this.getPrefix}:id:${id}`, newCustomer);
    if (customer.email) await kvSet(`${this.getPrefix}:email:${customer.email}`, newCustomer);
    await kvSet(`${this.getPrefix}:phone:${customer.phone}`, newCustomer);

    return newCustomer;
  }

  async update(
    id: string,
    customer: Partial<CustomerReference>,
  ): Promise<CustomerReference> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Customer reference not found in KV");

    const updated = { ...existing, ...customer, updatedAt: new Date() };

    await kvSet(`${this.getPrefix}:id:${id}`, updated);
    if (updated.email) await kvSet(`${this.getPrefix}:email:${updated.email}`, updated);
    await kvSet(`${this.getPrefix}:phone:${updated.phone}`, updated);

    return updated;
  }
}
