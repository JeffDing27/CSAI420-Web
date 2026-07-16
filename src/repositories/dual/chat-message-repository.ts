import type { ChatMessage } from "@prisma/client";
import type { ChatMessageRepository } from "../interfaces";
import { KvChatMessageRepository } from "../kv/chat-message-repository";
import { PrismaChatMessageRepository } from "../prisma/chat-message-repository";

export class DualChatMessageRepository implements ChatMessageRepository {
  private prismaRepo = new PrismaChatMessageRepository();
  private kvRepo = new KvChatMessageRepository();

  async findBySessionId(chatSessionId: string): Promise<ChatMessage[]> {
    return this.prismaRepo.findBySessionId(chatSessionId);
  }

  async create(message: Omit<ChatMessage, "createdAt">): Promise<ChatMessage> {
    const created = await this.prismaRepo.create(message);

    this.kvRepo.create(message).catch((e) => {
      console.error(
        "Failed secondary write to KV for chat message:",
        message.chatSessionId,
        e,
      );
    });

    return created;
  }
}
