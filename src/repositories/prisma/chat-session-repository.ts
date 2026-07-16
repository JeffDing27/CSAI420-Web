import { prisma } from "@/lib/prisma";
import type { ChatSession } from "@prisma/client";
import type { ChatSessionRepository } from "../interfaces";

export class PrismaChatSessionRepository implements ChatSessionRepository {
  async findById(id: string): Promise<ChatSession | null> {
    return prisma.chatSession.findUnique({
      where: { id },
    });
  }

  async upsert(session: Omit<ChatSession, "createdAt" | "updatedAt">): Promise<ChatSession> {
    return prisma.chatSession.upsert({
      where: { id: session.id },
      update: {
        userId: session.userId,
        threadId: session.threadId,
        context: session.context || {},
        nextStep: session.nextStep,
        sessionActive: session.sessionActive,
        accessibilityMode: session.accessibilityMode,
        locale: session.locale,
        expiresAt: session.expiresAt,
      },
      create: {
        id: session.id,
        userId: session.userId,
        threadId: session.threadId,
        context: session.context || {},
        nextStep: session.nextStep,
        sessionActive: session.sessionActive,
        accessibilityMode: session.accessibilityMode,
        locale: session.locale,
        expiresAt: session.expiresAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.chatSession.deleteMany({
      where: { id },
    });
  }
}
