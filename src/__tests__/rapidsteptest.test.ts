import { beforeEach, describe, expect, it } from "vitest";
import { RepositoryFactory } from "@/repositories/provider-factory";
import { RapidStepTestService } from "@/services/rapid-step-test.service";

describe("RapidStepTest Service", () => {
  const service = new RapidStepTestService();
  const userRepo = RepositoryFactory.getUserRepository();
  let testUserId: string;

  beforeEach(async () => {
    // Create a mock user for testing tests
    const user = await userRepo.create({
      userName: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      firstName: "Test",
      lastName: "User",
      phone: `+1${Math.floor(Math.random() * 1000000000)}`,
      birthDate: "01/01/1980",
      region: "US",
      passwordHash: "hash",
      passwordSalt: "salt",
      externalUserId: null,
    });
    testUserId = user.id;
  });

  it("should create a rapid step test", async () => {
    const test = await service.submitTest({
      userId: testUserId,
      externalTestId: "ext_123",
      testData: { score: 95 },
      source: "MOBILE",
      completedAt: new Date(),
    });

    expect(test.id).toBeDefined();
    expect(test.userId).toBe(testUserId);
    expect(test.externalTestId).toBe("ext_123");

    // Retrieve the test
    const retrieved = await service.getTestById(test.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe(testUserId);
  });

  it("should be idempotent when using the same externalTestId", async () => {
    const test1 = await service.submitTest({
      userId: testUserId,
      externalTestId: "ext_abc",
      testData: { score: 80 },
      source: "MOBILE",
      completedAt: new Date(),
    });

    const test2 = await service.submitTest({
      userId: testUserId,
      externalTestId: "ext_abc",
      testData: { score: 80 },
      source: "MOBILE",
      completedAt: new Date(),
    });

    expect(test1.id).toBe(test2.id);
  });
});
