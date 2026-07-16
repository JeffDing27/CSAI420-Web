import { kvGet, kvSet, kvDelete } from "@/utils/kv-store";
import type { ChatSession } from "@prisma/client";
import type { ChatSessionRepository } from "../interfaces";

export class KvChatSessionRepository implements ChatSessionRepository {
  async findById(id: string): Promise<ChatSession | null> {
    const data = await kvGet<ChatSession>(`chatSession:${id}`);
    if (!data) return null;
    return {
      ...data,
      expiresAt: new Date(data.expiresAt),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  async upsert(session: Omit<ChatSession, "createdAt" | "updatedAt">): Promise<ChatSession> {
    let existing = await this.findById(session.id);
    
    const now = new Date();
    const updated: ChatSession = {
      ...session,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      context: session.context || {},
    };

    await kvSet(`chatSession:${session.id}`, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await kvDelete(`chatSession:${id}`);
  }
}
