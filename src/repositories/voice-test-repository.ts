import type { Prisma, VoiceTest } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type VoiceTestWrite = Omit<
  VoiceTest,
  "id" | "createdAt" | "updatedAt" | "testData"
> & { testData: Prisma.InputJsonValue };

export class VoiceTestRepository {
  async findByCallSid(callSid: string): Promise<VoiceTest | null> {
    return prisma.voiceTest.findUnique({
      where: { callSid },
    });
  }

  async upsert(test: VoiceTestWrite): Promise<VoiceTest> {
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
