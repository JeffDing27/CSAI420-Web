import type { Prisma, VoiceSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function numericPoints(value: Prisma.JsonValue): number[] {
  return Array.isArray(value)
    ? value.filter(
        (point): point is number =>
          typeof point === "number" && Number.isFinite(point),
      )
    : [];
}

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
        profileId: session.profileId,
        patientName: session.patientName,
        patientEmail: session.patientEmail,
        phoneNumber: session.phoneNumber,
        customerReferenceId: session.customerReferenceId,
        stediSessionToken: session.stediSessionToken,
        deviceId: session.deviceId,
        authenticationAttempts: session.authenticationAttempts,
        dominantFoot: session.dominantFoot,
        deviceConnected: session.deviceConnected,
        setOneSteps: session.setOneSteps,
        setTwoSteps: session.setTwoSteps,
        setOneStepPoints: numericPoints(
          session.setOneStepPoints,
        ) as Prisma.InputJsonArray,
        setTwoStepPoints: numericPoints(
          session.setTwoStepPoints,
        ) as Prisma.InputJsonArray,
        lastAnnouncedStep: session.lastAnnouncedStep,
        restStartedAt: session.restStartedAt,
        pausedStage: session.pausedStage,
        score: session.score,
        testStartedAt: session.testStartedAt,
        testCompletedAt: session.testCompletedAt,
        upstreamTestSubmittedAt: session.upstreamTestSubmittedAt,
        callStatus: session.callStatus,
        expiresAt: session.expiresAt,
      },
      create: {
        callSid: session.callSid,
        stage: session.stage,
        userId: session.userId,
        profileId: session.profileId,
        patientName: session.patientName,
        patientEmail: session.patientEmail,
        phoneNumber: session.phoneNumber,
        customerReferenceId: session.customerReferenceId,
        stediSessionToken: session.stediSessionToken,
        deviceId: session.deviceId,
        authenticationAttempts: session.authenticationAttempts,
        dominantFoot: session.dominantFoot,
        deviceConnected: session.deviceConnected,
        setOneSteps: session.setOneSteps,
        setTwoSteps: session.setTwoSteps,
        setOneStepPoints: numericPoints(
          session.setOneStepPoints,
        ) as Prisma.InputJsonArray,
        setTwoStepPoints: numericPoints(
          session.setTwoStepPoints,
        ) as Prisma.InputJsonArray,
        lastAnnouncedStep: session.lastAnnouncedStep,
        restStartedAt: session.restStartedAt,
        pausedStage: session.pausedStage,
        score: session.score,
        testStartedAt: session.testStartedAt,
        testCompletedAt: session.testCompletedAt,
        upstreamTestSubmittedAt: session.upstreamTestSubmittedAt,
        callStatus: session.callStatus,
        expiresAt: session.expiresAt,
      },
    });
  }

  async addSensorUpdate(
    callSid: string,
    setNumber: 1 | 2,
    count: number,
    points: number[],
    deviceId?: string,
  ): Promise<VoiceSession> {
    const stepField = setNumber === 1 ? "setOneSteps" : "setTwoSteps";
    const pointField =
      setNumber === 1 ? "setOneStepPoints" : "setTwoStepPoints";

    return prisma.$transaction(async (transaction) => {
      const current = await transaction.voiceSession.findUnique({
        where: { callSid },
      });
      if (!current) throw new Error("Voice session not found");

      return transaction.voiceSession.update({
        where: { callSid },
        data: {
          deviceConnected: true,
          ...(deviceId ? { deviceId } : {}),
          [stepField]: { increment: count },
          [pointField]: [
            ...numericPoints(current[pointField]),
            ...points,
          ] as Prisma.InputJsonArray,
        },
      });
    });
  }
}
