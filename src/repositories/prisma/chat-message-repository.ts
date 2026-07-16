import { prisma } from "@/lib/prisma";
import type { ChatMessage } from "@prisma/client";
import type { ChatMessageRepository } from "../interfaces";

export class PrismaChatMessageRepository implements ChatMessageRepository {
  async findBySessionId(chatSessionId: string): Promise<ChatMessage[]> {
    return prisma.chatMessage.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(message: Omit<ChatMessage, "createdAt">): Promise<ChatMessage> {
    return prisma.chatMessage.create({
      data: {
        ...message,
        metadata: message.metadata || {},
      },
    });
  }
}
