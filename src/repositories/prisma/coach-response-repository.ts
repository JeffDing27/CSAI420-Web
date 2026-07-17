import type { CoachResponse } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CoachResponseRepository } from "../interfaces";

export class PrismaCoachResponseRepository implements CoachResponseRepository {
  async findByEscalationId(escalationId: string): Promise<CoachResponse[]> {
    return prisma.coachResponse.findMany({
      where: { escalationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(
    response: Omit<CoachResponse, "id" | "createdAt">,
  ): Promise<CoachResponse> {
    return prisma.coachResponse.create({
      data: response,
    });
  }
}
