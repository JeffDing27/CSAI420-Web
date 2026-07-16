import { RepositoryFactory } from "@/repositories/provider-factory";
import type { RapidStepTest } from "@prisma/client";

export class RapidStepTestService {
  private repo = RepositoryFactory.getRapidStepTestRepository();

  async submitTest(data: Omit<RapidStepTest, "id" | "createdAt">): Promise<RapidStepTest> {
    if (!data.userId) {
      throw new Error("userId is required for rapid step test");
    }
    
    // Idempotency: if test with same externalTestId already exists, return it
    if (data.externalTestId) {
      const existingTests = await this.repo.findByUserId(data.userId);
      const existing = existingTests.find(t => t.externalTestId === data.externalTestId);
      if (existing) {
        return existing;
      }
    }

    return this.repo.create(data);
  }

  async getUserTests(userId: string): Promise<RapidStepTest[]> {
    return this.repo.findByUserId(userId);
  }

  async getTestById(id: string): Promise<RapidStepTest | null> {
    return this.repo.findById(id);
  }
}
