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
        userId: session.userId,
        patientName: session.patientName,
        patientEmail: session.patientEmail,
        phoneNumber: session.phoneNumber,
        customerReferenceId: session.customerReferenceId,
        authenticationAttempts: session.authenticationAttempts,
        dominantFoot: session.dominantFoot,
        deviceConnected: session.deviceConnected,
        setOneSteps: session.setOneSteps,
        setTwoSteps: session.setTwoSteps,
        lastAnnouncedStep: session.lastAnnouncedStep,
        restStartedAt: session.restStartedAt,
        pausedStage: session.pausedStage,
        score: session.score,
        testStartedAt: session.testStartedAt,
        testCompletedAt: session.testCompletedAt,
        callStatus: session.callStatus,
        expiresAt: session.expiresAt,
      },
      create: {
        callSid: session.callSid,
        stage: session.stage,
        userId: session.userId,
        patientName: session.patientName,
        patientEmail: session.patientEmail,
        phoneNumber: session.phoneNumber,
        customerReferenceId: session.customerReferenceId,
        authenticationAttempts: session.authenticationAttempts,
        dominantFoot: session.dominantFoot,
        deviceConnected: session.deviceConnected,
        setOneSteps: session.setOneSteps,
        setTwoSteps: session.setTwoSteps,
        lastAnnouncedStep: session.lastAnnouncedStep,
        restStartedAt: session.restStartedAt,
        pausedStage: session.pausedStage,
        score: session.score,
        testStartedAt: session.testStartedAt,
        testCompletedAt: session.testCompletedAt,
        callStatus: session.callStatus,
        expiresAt: session.expiresAt,
      },
    });
  }

  async addSteps(
    callSid: string,
    setNumber: 1 | 2,
    count: number,
  ): Promise<VoiceSession> {
    const stepField = setNumber === 1 ? "setOneSteps" : "setTwoSteps";
    return prisma.voiceSession.update({
      where: { callSid },
      data: {
        deviceConnected: true,
        [stepField]: { increment: count },
      },
    });
  }
}
