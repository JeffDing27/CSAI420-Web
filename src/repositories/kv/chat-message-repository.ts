import { kvGet, kvSet } from "@/utils/kv-store";
import type { ChatMessage } from "@prisma/client";
import type { ChatMessageRepository } from "../interfaces";

export class KvChatMessageRepository implements ChatMessageRepository {
  async findBySessionId(chatSessionId: string): Promise<ChatMessage[]> {
    const data = await kvGet<ChatMessage[]>(`chatMessages:${chatSessionId}`);
    if (!data) return [];
    return data.map((d) => ({
      ...d,
      createdAt: new Date(d.createdAt),
    }));
  }

  async create(message: Omit<ChatMessage, "createdAt">): Promise<ChatMessage> {
    const list = await this.findBySessionId(message.chatSessionId);
    
    const newMsg: ChatMessage = {
      ...message,
      metadata: message.metadata || {},
      createdAt: new Date(),
    };

    list.push(newMsg);
    await kvSet(`chatMessages:${message.chatSessionId}`, list);
    return newMsg;
  }
}
