import { prisma } from "@/lib/prisma";
import type { RapidStepTest } from "@prisma/client";
import type { RapidStepTestRepository } from "../interfaces";
import { normalizeJson } from "@/utils/json-normalize";

export class PrismaRapidStepTestRepository implements RapidStepTestRepository {
  async findById(id: string): Promise<RapidStepTest | null> {
    return prisma.rapidStepTest.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<RapidStepTest[]> {
    return prisma.rapidStepTest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    test: Omit<RapidStepTest, "id" | "createdAt">,
  ): Promise<RapidStepTest> {
    return prisma.rapidStepTest.create({
      data: {
        ...test,
        testData: normalizeJson(test.testData),
      },
    });
  }
}
