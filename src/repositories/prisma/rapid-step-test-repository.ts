import type { RapidStepTest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeJson } from "@/utils/json-normalize";
import type {
  RapidStepTestRepository,
  RapidStepTestWrite,
} from "../interfaces";

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

  async findByProfileId(profileId: string): Promise<RapidStepTest[]> {
    return prisma.rapidStepTest.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(test: RapidStepTestWrite): Promise<RapidStepTest> {
    return prisma.rapidStepTest.create({
      data: {
        ...test,
        testData: normalizeJson(test.testData),
      },
    });
  }
}
