import { kvGet, kvSet } from "@/utils/kv-store";
import type { Escalation } from "@prisma/client";
import crypto from "crypto";
import type { EscalationRepository } from "../interfaces";

export class KvEscalationRepository implements EscalationRepository {
  async findById(id: string): Promise<Escalation | null> {
    const list = await this.findAll();
    return list.find((e) => e.escalationId === id) || null;
  }

  async findAll(): Promise<Escalation[]> {
    const data = await kvGet<Escalation[]>("escalations");
    if (!data) return [];
    return data.map((d) => ({
      ...d,
      escalationTimestamp: new Date(d.escalationTimestamp),
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
    }));
  }

  async create(
    escalation: Omit<Escalation, "id" | "createdAt" | "updatedAt">,
  ): Promise<Escalation> {
    const list = await this.findAll();
    
    // Check if exists
    const existingIdx = list.findIndex(e => e.escalationId === escalation.escalationId);
    let newEsc: Escalation;

    if (existingIdx !== -1) {
      newEsc = {
        ...list[existingIdx],
        ...escalation,
        updatedAt: new Date(),
      };
      list[existingIdx] = newEsc;
    } else {
      newEsc = {
        ...escalation,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      list.push(newEsc);
    }

    await kvSet("escalations", list);
    return newEsc;
  }

  async update(id: string, escalation: Partial<Escalation>): Promise<Escalation> {
    const list = await this.findAll();
    const existingIdx = list.findIndex(e => e.escalationId === id);
    if (existingIdx === -1) {
      throw new Error(`Escalation ${id} not found`);
    }

    list[existingIdx] = { ...list[existingIdx], ...escalation, updatedAt: new Date() } as any;
    await kvSet("escalations", list);
    return list[existingIdx];
  }
}
