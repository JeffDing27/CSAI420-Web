import { beforeEach, describe, expect, it } from "vitest";
import { RapidStepTestService } from "@/services/rapid-step-test.service";
import prisma from "@/lib/prisma";

describe("RapidStepTest Service", () => {
  const service = new RapidStepTestService();
  let testProfileId: string;

  beforeEach(async () => {
    // Create a mock profile for testing tests
    const profile = await prisma.profile.create({
      data: {
        externalEmail: `test_${Date.now()}@example.com`,
        role: "PATIENT",
      }
    });
    testProfileId = profile.id;
  });

  it("should create a rapid step test", async () => {
    const test = await service.submitTest({
      userId: null,
      profileId: testProfileId,
      deviceRecordId: null,
      externalTestId: "ext_123",
      testData: { score: 95 },
      source: "MOBILE",
      completedAt: new Date(),
    });

    expect(test.id).toBeDefined();
    expect(test.profileId).toBe(testProfileId);
    expect(test.externalTestId).toBe("ext_123");

    // Retrieve the test
    const retrieved = await service.getTestById(test.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.profileId).toBe(testProfileId);
  });

  it("should be idempotent when using the same externalTestId", async () => {
    const test1 = await service.submitTest({
      userId: null,
      profileId: testProfileId,
      deviceRecordId: null,
      externalTestId: "ext_abc",
      testData: { score: 80 },
      source: "MOBILE",
      completedAt: new Date(),
    });

    const test2 = await service.submitTest({
      userId: null,
      profileId: testProfileId,
      deviceRecordId: null,
      externalTestId: "ext_abc",
      testData: { score: 80 },
      source: "MOBILE",
      completedAt: new Date(),
    });

    expect(test1.id).toBe(test2.id);
  });
});
