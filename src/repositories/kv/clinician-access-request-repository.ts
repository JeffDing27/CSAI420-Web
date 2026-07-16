import { kvGet, kvSet } from "@/utils/kv-store";
import type { ClinicianAccessRequest } from "@prisma/client";
import crypto from "crypto";
import type { ClinicianAccessRequestRepository } from "../interfaces";

export class KvClinicianAccessRequestRepository implements ClinicianAccessRequestRepository {
  async findByCustomer(customerEmail: string): Promise<ClinicianAccessRequest[]> {
    const data = await kvGet<ClinicianAccessRequest[]>(`clinicianAccessRequests:${customerEmail}`);
    return data || [];
  }

  async create(
    request: Omit<ClinicianAccessRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<ClinicianAccessRequest> {
    const newRequest: ClinicianAccessRequest = {
      ...request,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const list = await this.findByCustomer(request.customerEmail);
    // Remove if already exists to mimic DB uniqueness (or could return error)
    const existingIdx = list.findIndex(r => r.clinicianUsername === request.clinicianUsername);
    if (existingIdx !== -1) {
       list[existingIdx] = newRequest;
    } else {
       list.push(newRequest);
    }
    
    await kvSet(`clinicianAccessRequests:${request.customerEmail}`, list);
    return newRequest;
  }

  async updateStatus(id: string, status: string): Promise<ClinicianAccessRequest> {
    // This is hard to do without the customer email, since we indexed by email.
    // As a workaround, we will not fully support KV updateStatus by ID without scanning if needed,
    // but in Dual mode Prisma handles it.
    throw new Error("updateStatus not supported in KV mock directly");
  }

  async delete(customerEmail: string, clinicianUsername: string): Promise<boolean> {
    const list = await this.findByCustomer(customerEmail);
    const initialLen = list.length;
    const filtered = list.filter(r => r.clinicianUsername !== clinicianUsername);
    if (filtered.length !== initialLen) {
       await kvSet(`clinicianAccessRequests:${customerEmail}`, filtered);
       return true;
    }
    return false;
  }
}
