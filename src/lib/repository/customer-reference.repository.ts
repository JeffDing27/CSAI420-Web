import type { CustomerReference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kvGet, kvSet } from "@/utils/kv-store";

export type CreateCustomerRefParams = Omit<
  CustomerReference,
  "id" | "createdAt" | "updatedAt"
>;

export class CustomerReferenceRepository {
  static async findByPhone(phone: string): Promise<CustomerReference | null> {
    const provider = process.env.STORAGE_PROVIDER || "kv";

    if (provider === "supabase" || provider === "dual") {
      const cust = await prisma.customerReference.findUnique({
        where: { phone },
      });
      if (provider === "supabase" || cust) return cust;
    }

    if (provider === "kv" || provider === "dual") {
      // Typically CustomerReference isn't heavily used in KV auth, but if we have it, we store it by phone.
      const kvCust = await kvGet<CustomerReference>(
        `customer_ref:phone:${phone}`,
      );
      if (kvCust) return kvCust;
    }

    return null;
  }

  static async findByEmail(email: string): Promise<CustomerReference | null> {
    const provider = process.env.STORAGE_PROVIDER || "kv";

    if (provider === "supabase" || provider === "dual") {
      const cust = await prisma.customerReference.findUnique({
        where: { email },
      });
      if (provider === "supabase" || cust) return cust;
    }

    if (provider === "kv" || provider === "dual") {
      const kvCust = await kvGet<CustomerReference>(
        `customer_ref:email:${email}`,
      );
      if (kvCust) return kvCust;
    }

    return null;
  }

  static async upsert(
    data: CreateCustomerRefParams,
  ): Promise<CustomerReference> {
    const provider = process.env.STORAGE_PROVIDER || "kv";
    let upserted: CustomerReference | null = null;

    if (provider === "supabase" || provider === "dual") {
      // Upsert by phone or email. Prisma requires unique constraint.
      // CustomerReference has unique phone and email.
      // If we don't have an ID, we check by phone.
      const existing = await prisma.customerReference.findFirst({
        where: {
          OR: [{ phone: data.phone }, { email: data.email }],
        },
      });

      if (existing) {
        upserted = await prisma.customerReference.update({
          where: { id: existing.id },
          data,
        });
      } else {
        upserted = await prisma.customerReference.create({ data });
      }
    }

    if (provider === "kv" || provider === "dual") {
      const kvData = {
        ...data,
        id: upserted ? upserted.id : crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await kvSet(`customer_ref:phone:${data.phone}`, kvData);
      await kvSet(`customer_ref:email:${data.email}`, kvData);

      if (provider === "kv") {
        upserted = kvData as CustomerReference;
      }
    }

    return upserted!;
  }
}
