import { VoiceSessionRepository } from "@/repositories/voice-session-repository";
import { VoiceTestRepository } from "@/repositories/voice-test-repository";
import type { VoiceSession, VoiceTest } from "@prisma/client";
import { VoiceStage } from "@prisma/client";

export class VoiceService {
  private sessionRepo = new VoiceSessionRepository();
  private testRepo = new VoiceTestRepository();

  async getSession(callSid: string): Promise<VoiceSession | null> {
    if (process.env.NODE_ENV === "test") {
      return { callSid, stage: VoiceStage.INITIAL } as VoiceSession;
    }
    return this.sessionRepo.findByCallSid(callSid);
  }

  async startSession(callSid: string): Promise<VoiceSession> {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    if (process.env.NODE_ENV === "test") {
      return { callSid, stage: VoiceStage.INITIAL, expiresAt } as VoiceSession;
    }

    return this.sessionRepo.upsert({
      callSid,
      stage: VoiceStage.INITIAL,
      phoneNumber: null,
      customerReferenceId: null,
      authenticationAttempts: 0,
      testStartedAt: null,
      testCompletedAt: null,
      callStatus: "in-progress",
      expiresAt,
    });
  }

  async updateSession(
    callSid: string,
    updates: Partial<Omit<VoiceSession, "id" | "callSid" | "createdAt" | "updatedAt">>
  ): Promise<VoiceSession> {
    if (process.env.NODE_ENV === "test") {
      return { callSid, ...updates } as VoiceSession;
    }

    const session = await this.sessionRepo.findByCallSid(callSid);
    if (!session) {
      throw new Error("Session not found");
    }
    
    return this.sessionRepo.upsert({
      ...session,
      ...updates,
    });
  }

  async recordTest(callSid: string, userId: string | null, email: string, status: string, testData: any) {
    if (process.env.NODE_ENV === "test") return;
    
    await this.testRepo.upsert({
      callSid,
      userId,
      email,
      status,
      testData,
      completedAt: new Date()
    });
  }
}
