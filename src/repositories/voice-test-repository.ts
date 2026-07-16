import { prisma } from "@/lib/prisma";
import type { VoiceTest } from "@prisma/client";

export class VoiceTestRepository {
  async findByCallSid(callSid: string): Promise<VoiceTest | null> {
    return prisma.voiceTest.findUnique({
      where: { callSid },
    });
  }

  async upsert(test: Omit<VoiceTest, "id" | "createdAt" | "updatedAt">): Promise<VoiceTest> {
    return prisma.voiceTest.upsert({
      where: { callSid: test.callSid },
      update: {
        userId: test.userId,
        email: test.email,
        status: test.status,
        testData: test.testData || {},
        completedAt: test.completedAt,
      },
      create: {
        callSid: test.callSid,
        userId: test.userId,
        email: test.email,
        status: test.status,
        testData: test.testData || {},
        completedAt: test.completedAt,
      },
    });
  }
}
