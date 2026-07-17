import type { VoiceSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class VoiceSessionRepository {
  async findByCallSid(callSid: string): Promise<VoiceSession | null> {
    return prisma.voiceSession.findUnique({
      where: { callSid },
    });
  }

  async upsert(
    session: Omit<VoiceSession, "id" | "createdAt" | "updatedAt">,
  ): Promise<VoiceSession> {
    return prisma.voiceSession.upsert({
      where: { callSid: session.callSid },
      update: {
        stage: session.stage,
        phoneNumber: session.phoneNumber,
        customerReferenceId: session.customerReferenceId,
        authenticationAttempts: session.authenticationAttempts,
        testStartedAt: session.testStartedAt,
        testCompletedAt: session.testCompletedAt,
        callStatus: session.callStatus,
        expiresAt: session.expiresAt,
      },
      create: {
        callSid: session.callSid,
        stage: session.stage,
        phoneNumber: session.phoneNumber,
        customerReferenceId: session.customerReferenceId,
        authenticationAttempts: session.authenticationAttempts,
        testStartedAt: session.testStartedAt,
        testCompletedAt: session.testCompletedAt,
        callStatus: session.callStatus,
        expiresAt: session.expiresAt,
      },
    });
  }
}
