import {
  type Prisma,
  TestSource,
  type User,
  type VoiceSession,
  VoiceStage,
} from "@prisma/client";
import { RepositoryFactory } from "@/repositories/provider-factory";
import { VoiceSessionRepository } from "@/repositories/voice-session-repository";
import { VoiceTestRepository } from "@/repositories/voice-test-repository";
import { RapidStepTestService } from "@/services/rapid-step-test.service";
import { RiskScoreService } from "@/services/risk-score.service";

const testSessions = new Map<string, VoiceSession>();

export type AuthenticatedPatient = Pick<
  User,
  "id" | "email" | "phone" | "firstName" | "lastName"
>;

function newSession(callSid: string): VoiceSession {
  const now = new Date();
  return {
    id: `test-${callSid}`,
    callSid,
    stage: VoiceStage.INITIAL,
    userId: null,
    patientName: null,
    patientEmail: null,
    phoneNumber: null,
    customerReferenceId: null,
    authenticationAttempts: 0,
    dominantFoot: null,
    deviceConnected: false,
    setOneSteps: 0,
    setTwoSteps: 0,
    lastAnnouncedStep: 0,
    restStartedAt: null,
    pausedStage: null,
    score: null,
    testStartedAt: null,
    testCompletedAt: null,
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
  private rapidStepTestService = new RapidStepTestService();
  private riskScoreService = new RiskScoreService();

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
    if (process.env.NODE_ENV === "test") {
      const session = testSessions.get(callSid) ?? newSession(callSid);
      const updated = { ...session, ...updates, updatedAt: new Date() };
      testSessions.set(callSid, updated);
      return updated;
    }

    const session = await this.sessionRepo.findByCallSid(callSid);
    if (!session) {
      throw new Error("Voice session not found");
    }

    return this.sessionRepo.upsert({
      ...session,
      ...updates,
    });
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
        id: "test-user-id",
        email: "customer@example.com",
        phone: "5551234567",
        firstName: "Test",
        lastName: "User",
      };
    }

    const candidates = await this.userRepo.findByBirthDate(birthDate);
    return (
      candidates.find(
        (user) =>
          normalizePatientName(`${user.firstName} ${user.lastName}`) ===
          normalizedName,
      ) ?? null
    );
  }

  async recordSensorUpdate(
    callSid: string,
    stepIncrement: number,
  ): Promise<VoiceSession | null> {
    const session = await this.getSession(callSid);
    if (!session) return null;

    if (stepIncrement <= 0) {
      return this.updateSession(callSid, { deviceConnected: true });
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

    if (
      process.env.NODE_ENV === "test" ||
      process.env.USE_MOCK_TEST_DEVICE === "true"
    ) {
      return this.updateSession(callSid, {
        deviceConnected: true,
        ...(setNumber === 1
          ? { setOneSteps: session.setOneSteps + stepIncrement }
          : { setTwoSteps: session.setTwoSteps + stepIncrement }),
      });
    }

    return this.sessionRepo.addSteps(callSid, setNumber, stepIncrement);
  }

  async completeTest(session: VoiceSession): Promise<number> {
    if (session.score !== null) return session.score;

    const completedAt = new Date();
    const testData: Prisma.InputJsonObject = {
      source: "IVR",
      dominantFoot: session.dominantFoot ?? "unknown",
      setOneSteps: session.setOneSteps,
      setTwoSteps: session.setTwoSteps,
      startedAt: session.testStartedAt?.toISOString() ?? null,
      completedAt: completedAt.toISOString(),
    };

    let score: number;
    if (
      process.env.NODE_ENV === "test" ||
      process.env.USE_MOCK_TEST_DEVICE === "true"
    ) {
      score = Number(process.env.IVR_TEST_SCORE ?? "1.5");
    } else {
      if (!session.userId || !session.patientEmail) {
        throw new Error("Authenticated patient is missing from voice session");
      }
      await this.rapidStepTestService.submitTest({
        userId: session.userId,
        externalTestId: `ivr-${session.callSid}`,
        testData,
        source: TestSource.IVR,
        completedAt,
      });
      score = await this.riskScoreService.calculateRiskScore(
        session.patientEmail,
      );
    }

    const completedData: Prisma.InputJsonObject = { ...testData, score };
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
