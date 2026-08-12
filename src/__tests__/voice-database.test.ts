import { type VoiceSession, VoiceStage } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { birthDateVariants } from "@/repositories/prisma/user-repository";
import { VoiceSessionRepository } from "@/repositories/voice-session-repository";

const { upsertVoiceSession } = vi.hoisted(() => ({
  upsertVoiceSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    voiceSession: {
      upsert: upsertVoiceSession,
    },
  },
}));

describe("IVR database compatibility", () => {
  beforeEach(() => {
    upsertVoiceSession.mockReset();
  });

  it("matches the birth-date formats stored by legacy and bridged users", () => {
    const variants = birthDateVariants("1990-01-01");

    expect(variants).toContain("1990-01-01");
    expect(variants).toContain("01/01/1990");
    expect(variants).toContain("1/1/1990");
    expect(variants).toContain("01011990");
    expect(variants).toContain("111990");
  });

  it("persists the bridged profile on voice-session creates and updates", async () => {
    const now = new Date();
    const session = {
      callSid: "CA-database-test",
      stage: VoiceStage.SAFETY_CHECK,
      userId: "legacy-user-id",
      profileId: "bridged-profile-id",
      patientName: "Test User",
      patientEmail: "test@example.com",
      phoneNumber: "+15555550100",
      customerReferenceId: "customer-reference-id",
      stediSessionToken: "caller-scoped-token",
      deviceId: "device-007",
      authenticationAttempts: 0,
      dominantFoot: null,
      deviceConnected: false,
      setOneSteps: 0,
      setTwoSteps: 0,
      setOneStepPoints: [],
      setTwoStepPoints: [],
      lastAnnouncedStep: 0,
      restStartedAt: null,
      pausedStage: null,
      score: null,
      testStartedAt: null,
      testCompletedAt: null,
      upstreamTestSubmittedAt: null,
      callStatus: "in-progress",
      expiresAt: now,
    } satisfies Omit<VoiceSession, "id" | "createdAt" | "updatedAt">;
    upsertVoiceSession.mockResolvedValue({
      ...session,
      id: "session-id",
      createdAt: now,
      updatedAt: now,
    });

    await new VoiceSessionRepository().upsert(session);

    expect(upsertVoiceSession).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          profileId: "bridged-profile-id",
          stediSessionToken: "caller-scoped-token",
          deviceId: "device-007",
          setOneStepPoints: [],
          setTwoStepPoints: [],
        }),
        create: expect.objectContaining({
          profileId: "bridged-profile-id",
          stediSessionToken: "caller-scoped-token",
          deviceId: "device-007",
          setOneStepPoints: [],
          setTwoStepPoints: [],
        }),
      }),
    );
  });
});
