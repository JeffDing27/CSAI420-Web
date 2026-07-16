import type { ChatSession } from "@prisma/client";
import type { ChatSessionRepository } from "../interfaces";
import { KvChatSessionRepository } from "../kv/chat-session-repository";
import { PrismaChatSessionRepository } from "../prisma/chat-session-repository";

export class DualChatSessionRepository implements ChatSessionRepository {
  private prismaRepo = new PrismaChatSessionRepository();
  private kvRepo = new KvChatSessionRepository();

  async findById(id: string): Promise<ChatSession | null> {
    return this.prismaRepo.findById(id);
  }

  async upsert(session: Omit<ChatSession, "createdAt" | "updatedAt">): Promise<ChatSession> {
    const upserted = await this.prismaRepo.upsert(session);

    this.kvRepo.upsert(session).catch((e) => {
      console.error(
        "Failed secondary write to KV for chat session:",
        session.id,
        e,
      );
    });

    return upserted;
  }

  async delete(id: string): Promise<void> {
    await this.prismaRepo.delete(id);

    this.kvRepo.delete(id).catch((e) => {
      console.error(
        "Failed secondary delete to KV for chat session:",
        id,
        e,
      );
    });
  }
}
