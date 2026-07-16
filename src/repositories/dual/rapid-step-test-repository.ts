import type { RapidStepTest } from "@prisma/client";
import type { RapidStepTestRepository } from "../interfaces";
import { KvRapidStepTestRepository } from "../kv/rapid-step-test-repository";
import { PrismaRapidStepTestRepository } from "../prisma/rapid-step-test-repository";

export class DualRapidStepTestRepository implements RapidStepTestRepository {
  private prismaRepo = new PrismaRapidStepTestRepository();
  private kvRepo = new KvRapidStepTestRepository();

  async findById(id: string): Promise<RapidStepTest | null> {
    return this.prismaRepo.findById(id);
  }

  async findByUserId(userId: string): Promise<RapidStepTest[]> {
    return this.prismaRepo.findByUserId(userId);
  }

  async create(
    test: Omit<RapidStepTest, "id" | "createdAt">,
  ): Promise<RapidStepTest> {
    // Write to Supabase first
    const createdTest = await this.prismaRepo.create(test);

    // Secondary write to KV
    this.kvRepo.create({ ...test, id: createdTest.id } as any).catch((e) => {
      console.error(
        "Failed secondary write to KV for rapidsteptest:",
        createdTest.id,
        e,
      );
    });

    return createdTest;
  }
}
