import type { Escalation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EscalationRepository } from "../interfaces";

export class PrismaEscalationRepository implements EscalationRepository {
  async findById(id: string): Promise<Escalation | null> {
    return prisma.escalation.findUnique({
      where: { escalationId: id },
    });
  }

  async findAll(): Promise<Escalation[]> {
    return prisma.escalation.findMany({
      orderBy: { escalationTimestamp: "desc" },
    });
  }

  async create(
    escalation: Omit<Escalation, "id" | "createdAt" | "updatedAt">,
  ): Promise<Escalation> {
    return prisma.escalation.upsert({
      where: { escalationId: escalation.escalationId },
      update: escalation,
      create: escalation,
    });
  }

  async update(
    id: string,
    escalation: Partial<Escalation>,
  ): Promise<Escalation> {
    return prisma.escalation.update({
      where: { escalationId: id },
      data: escalation,
    });
  }
}
