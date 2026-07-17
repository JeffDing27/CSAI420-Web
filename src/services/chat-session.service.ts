import type { ChatSession } from "@prisma/client";
import { RepositoryFactory } from "@/repositories/provider-factory";

export class ChatSessionService {
  private repo = RepositoryFactory.getChatSessionRepository();

  async getSession(id: string): Promise<ChatSession | null> {
    return this.repo.findById(id);
  }

  async createSession(id: string): Promise<ChatSession> {
    return this.upsertSession({
      id,
      userId: null,
      threadId: null,
      context: { collectedFields: {}, conversationContext: [] },
      nextStep: "greeting",
      sessionActive: true,
      accessibilityMode: false,
      locale: "en",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
  }

  async upsertSession(
    session: Omit<ChatSession, "createdAt" | "updatedAt">,
  ): Promise<ChatSession> {
    return this.repo.upsert(session);
  }

  async endSession(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
