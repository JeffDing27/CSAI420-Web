import type { RapidStepTest } from "@prisma/client";
import type { RapidStepTestWrite } from "@/repositories/interfaces";
import { RepositoryFactory } from "@/repositories/provider-factory";

export class RapidStepTestService {
  private repo = RepositoryFactory.getRapidStepTestRepository();

  async submitTest(data: RapidStepTestWrite): Promise<RapidStepTest> {
    if (!data.userId && !data.profileId) {
      throw new Error("userId or profileId is required for rapid step test");
    }

    // Idempotency: if test with same externalTestId already exists, return it
    if (data.externalTestId) {
      let existingTests: RapidStepTest[] = [];
      if (data.profileId) {
        existingTests = await this.repo.findByProfileId(data.profileId);
      } else if (data.userId) {
        existingTests = await this.repo.findByUserId(data.userId);
      }

      const existing = existingTests.find(
        (t) => t.externalTestId === data.externalTestId,
      );
      if (existing) {
        return existing;
      }
    }

    return this.repo.create(data);
  }

  async getUserTests(userId: string): Promise<RapidStepTest[]> {
    return this.repo.findByUserId(userId);
  }

  async getProfileTests(profileId: string): Promise<RapidStepTest[]> {
    return this.repo.findByProfileId(profileId);
  }

  async getTestById(id: string): Promise<RapidStepTest | null> {
    return this.repo.findById(id);
  }
}
