import {
  type Prisma,
  TestSource,
  type VoiceSession,
  VoiceStage,
} from "@prisma/client";
import { StediAuthService } from "@/lib/service/stedi-auth.service";
import { RepositoryFactory } from "@/repositories/provider-factory";
import { VoiceSessionRepository } from "@/repositories/voice-session-repository";
import { VoiceTestRepository } from "@/repositories/voice-test-repository";
import {
  LegacyStediApiError,
  LegacyStediIvrService,
  normalizeLegacyPhone,
} from "@/services/legacy-stedi-ivr.service";
import { RapidStepTestService } from "@/services/rapid-step-test.service";

const testSessions = new Map<string, VoiceSession>();

export type AuthenticatedPatient = {
  userId: string | null;
  email: string;
  phone: string;
  patientName: string;
  profileId: string | null;
  customerReferenceId: string | null;
  stediSessionToken: string | null;
  deviceId: string | null;
};

function usesMockUpstream(): boolean {
  if (process.env.USE_MOCK_TEST_DEVICE === "true") return true;
  return (
    process.env.NODE_ENV === "test" &&
    process.env.IVR_USE_LEGACY_API_IN_TESTS !== "true"
  );
}

function numericStepPoints(value: Prisma.JsonValue): number[] {
  return Array.isArray(value)
    ? value.filter(
        (point): point is number =>
          typeof point === "number" && Number.isFinite(point) && point > 0,
      )
    : [];
}

function newSession(callSid: string): VoiceSession {
  const now = new Date();
  return {
    id: `test-${callSid}`,
    callSid,
    stage: VoiceStage.INITIAL,
    userId: null,
    profileId: null,
    patientName: null,
    patientEmail: null,
    phoneNumber: null,
    customerReferenceId: null,
    stediSessionToken: null,
    deviceId: null,
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
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizePatientName(name: string): string {
  return name
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function dobDigitsToIso(digits: string): string | null {
  if (!/^\d{8}$/.test(digits)) return null;
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date > new Date()
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function resetVoiceTestSessions(): void {
  testSessions.clear();
}

export class VoiceService {
  private sessionRepo = new VoiceSessionRepository();
  private testRepo = new VoiceTestRepository();
  private userRepo = RepositoryFactory.getUserRepository();
  private customerReferenceRepo =
    RepositoryFactory.getCustomerReferenceRepository();
  private rapidStepTestService = new RapidStepTestService();
  private legacyStediService = new LegacyStediIvrService();

  shouldUseLegacyApi(): boolean {
    return !usesMockUpstream();
  }

  async getSession(callSid: string): Promise<VoiceSession | null> {
    if (process.env.NODE_ENV === "test") {
      return testSessions.get(callSid) ?? null;
    }
    return this.sessionRepo.findByCallSid(callSid);
  }

  async startSession(callSid: string): Promise<VoiceSession> {
    if (process.env.NODE_ENV === "test") {
      const existing = testSessions.get(callSid);
      if (existing) return existing;
      const session = newSession(callSid);
      testSessions.set(callSid, session);
      return session;
    }

    const session = newSession(callSid);
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...data
    } = session;
    return this.sessionRepo.upsert(data);
  }

  async updateSession(
    callSid: string,
    updates: Partial<
      Omit<VoiceSession, "id" | "callSid" | "createdAt" | "updatedAt">
    >,
  ): Promise<VoiceSession> {
    const securedUpdates =
      updates.stage === VoiceStage.COMPLETED ||
      updates.stage === VoiceStage.FAILED
        ? { ...updates, stediSessionToken: null }
        : updates;

    if (process.env.NODE_ENV === "test") {
      const session = testSessions.get(callSid) ?? newSession(callSid);
      const updated = { ...session, ...securedUpdates, updatedAt: new Date() };
      testSessions.set(callSid, updated);
      return updated;
    }

    const session = await this.sessionRepo.findByCallSid(callSid);
    if (!session) {
      throw new Error("Voice session not found");
    }

    return this.sessionRepo.upsert({
      ...session,
      ...securedUpdates,
    });
  }

  normalizeLegacyPhoneNumber(rawPhoneNumber: string): string {
    const phoneNumber = normalizeLegacyPhone(rawPhoneNumber);
    if (!phoneNumber) {
      throw new LegacyStediApiError("A valid US phone number is required", 400);
    }
    return phoneNumber;
  }

  async authenticateLegacyBirthDate(
    phoneNumber: string,
    dobDigits: string,
  ): Promise<AuthenticatedPatient> {
    if (!dobDigitsToIso(dobDigits)) {
      throw new LegacyStediApiError("A valid date of birth is required", 400);
    }
    const token = await this.legacyStediService.verifyBirthDate(
      phoneNumber,
      dobDigits,
    );
    const account = await this.legacyStediService.resolveAccount(
      phoneNumber,
      token,
    );
    const [localUser, profile, customerReference] = await Promise.all([
      this.userRepo.findByEmail(account.email),
      StediAuthService.upsertProfile(account.email),
      this.customerReferenceRepo.findByEmail(account.email),
    ]);

    return {
      userId: localUser?.id ?? null,
      email: account.email,
      phone: account.phoneNumber,
      patientName: account.patientName,
      profileId: profile.id,
      customerReferenceId: customerReference?.id ?? null,
      stediSessionToken: token,
      deviceId: account.deviceId,
    };
  }

  async authenticatePatient(
    patientName: string,
    dobDigits: string,
  ): Promise<AuthenticatedPatient | null> {
    const birthDate = dobDigitsToIso(dobDigits);
    if (!birthDate) return null;

    const normalizedName = normalizePatientName(patientName);
    if (
      (process.env.NODE_ENV === "test" ||
        process.env.USE_MOCK_TEST_DEVICE === "true") &&
      normalizedName === "test user" &&
      birthDate === "1990-01-01"
    ) {
      return {
        userId: "test-user-id",
        email: "customer@example.com",
        phone: "5551234567",
        patientName: "Test User",
        profileId: null,
        customerReferenceId: null,
        stediSessionToken: null,
        deviceId: "test-device",
      };
    }

    const candidates = await this.userRepo.findByBirthDate(birthDate);
    const user = candidates.find(
      (candidate) =>
        normalizePatientName(`${candidate.firstName} ${candidate.lastName}`) ===
        normalizedName,
    );
    if (!user) return null;

    const [profile, customerReference] = await Promise.all([
      StediAuthService.upsertProfile(user.email),
      this.customerReferenceRepo.findByEmail(user.email.toLowerCase()),
    ]);

    return {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      patientName: `${user.firstName} ${user.lastName}`,
      profileId: profile.id,
      customerReferenceId: customerReference?.id ?? null,
      stediSessionToken: null,
      deviceId: null,
    };
  }

  async recordSensorUpdate(
    callSid: string,
    stepIncrement: number,
    sensor: { deviceId?: string; stepPoints?: number[] } = {},
  ): Promise<VoiceSession | null> {
    const session = await this.getSession(callSid);
    if (!session) return null;

    if (stepIncrement <= 0) {
      return this.updateSession(callSid, {
        deviceConnected: true,
        ...(sensor.deviceId ? { deviceId: sensor.deviceId } : {}),
      });
    }

    const setNumber =
      session.stage === VoiceStage.SET_ONE_IN_PROGRESS
        ? 1
        : session.stage === VoiceStage.SET_TWO_IN_PROGRESS
          ? 2
          : null;
    if (!setNumber) {
      return this.updateSession(callSid, { deviceConnected: true });
    }

    if (process.env.NODE_ENV === "test" || usesMockUpstream()) {
      const pointField =
        setNumber === 1 ? "setOneStepPoints" : "setTwoStepPoints";
      return this.updateSession(callSid, {
        deviceConnected: true,
        ...(sensor.deviceId ? { deviceId: sensor.deviceId } : {}),
        [pointField]: [
          ...numericStepPoints(session[pointField]),
          ...(sensor.stepPoints ?? []),
        ],
        ...(setNumber === 1
          ? { setOneSteps: session.setOneSteps + stepIncrement }
          : { setTwoSteps: session.setTwoSteps + stepIncrement }),
      });
    }

    return this.sessionRepo.addSensorUpdate(
      callSid,
      setNumber,
      stepIncrement,
      sensor.stepPoints ?? [],
      sensor.deviceId,
    );
  }

  async completeTest(session: VoiceSession): Promise<number> {
    if (session.score !== null) return session.score;

    const completedAt = new Date();
    const baseTestData: Prisma.InputJsonObject = {
      source: "IVR",
      dominantFoot: session.dominantFoot ?? "unknown",
      setOneSteps: session.setOneSteps,
      setTwoSteps: session.setTwoSteps,
      startedAt: session.testStartedAt?.toISOString() ?? null,
      completedAt: completedAt.toISOString(),
    };

    let score: number;
    if (usesMockUpstream()) {
      score = Number(process.env.IVR_TEST_SCORE ?? "1.5");
    } else {
      if (!session.patientEmail || !session.stediSessionToken) {
        throw new Error(
          "Authenticated legacy STEDI account is missing from voice session",
        );
      }
      if (!session.deviceId || !session.testStartedAt) {
        throw new Error("IVR device and test start time are required");
      }

      const stepPoints = [
        ...numericStepPoints(session.setOneStepPoints),
        ...numericStepPoints(session.setTwoStepPoints),
      ];
      const totalSteps = session.setOneSteps + session.setTwoSteps;
      if (stepPoints.length !== totalSteps || totalSteps < 1) {
        throw new Error(
          "IVR sensor stepPoints must match the recorded step count",
        );
      }
      const testTime = Math.round(
        stepPoints.reduce((total, point) => total + point, 0),
      );
      const startTime = session.testStartedAt.getTime();

      if (!session.upstreamTestSubmittedAt) {
        await this.legacyStediService.submitRapidStepTest(
          session.stediSessionToken,
          {
            customer: session.patientEmail,
            startTime,
            stepPoints,
            stopTime: startTime + testTime,
            testTime,
            totalSteps,
            deviceId: session.deviceId,
          },
        );
        await this.updateSession(session.callSid, {
          upstreamTestSubmittedAt: new Date(),
        });
      }

      score = await this.legacyStediService.getRiskScore(
        session.patientEmail,
        session.stediSessionToken,
      );
    }

    const completedData: Prisma.InputJsonObject = { ...baseTestData, score };
    if (!usesMockUpstream()) {
      await this.rapidStepTestService.submitTest({
        userId: session.userId,
        externalTestId: `ivr-${session.callSid}`,
        testData: completedData,
        source: TestSource.IVR,
        completedAt,
        deviceRecordId: null,
        profileId: session.profileId,
      });
    }
    await this.recordTest(
      session.callSid,
      session.userId,
      session.patientEmail ?? "",
      "COMPLETED",
      completedData,
    );
    await this.updateSession(session.callSid, {
      score,
      stage: VoiceStage.COMPLETED,
      testCompletedAt: completedAt,
      callStatus: "completed",
    });
    return score;
  }

  async recordTest(
    callSid: string,
    userId: string | null,
    email: string,
    status: string,
    testData: Prisma.InputJsonValue,
  ): Promise<void> {
    if (process.env.NODE_ENV === "test") return;

    await this.testRepo.upsert({
      callSid,
      userId,
      email,
      status,
      testData,
      completedAt: new Date(),
    });
  }
}
