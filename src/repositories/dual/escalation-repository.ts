import type { Escalation } from "@prisma/client";
import type { EscalationRepository } from "../interfaces";
import { KvEscalationRepository } from "../kv/escalation-repository";
import { PrismaEscalationRepository } from "../prisma/escalation-repository";

export class DualEscalationRepository implements EscalationRepository {
  private prismaRepo = new PrismaEscalationRepository();
  private kvRepo = new KvEscalationRepository();

  async findById(id: string): Promise<Escalation | null> {
    return this.prismaRepo.findById(id);
  }

  async findAll(): Promise<Escalation[]> {
    return this.prismaRepo.findAll();
  }

  async create(
    escalation: Omit<Escalation, "id" | "createdAt" | "updatedAt">,
  ): Promise<Escalation> {
    const created = await this.prismaRepo.create(escalation);

    this.kvRepo.create(escalation).catch((e) => {
      console.error(
        "Failed secondary write to KV for escalation:",
        escalation.escalationId,
        e,
      );
    });

    return created;
  }

  async update(id: string, escalation: Partial<Escalation>): Promise<Escalation> {
    const updated = await this.prismaRepo.update(id, escalation);

    this.kvRepo.update(id, escalation).catch((e) => {
      console.error(
        "Failed secondary update to KV for escalation:",
        id,
        e,
      );
    });

    return updated;
  }
}
