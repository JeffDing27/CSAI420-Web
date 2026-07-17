import type { ChatMessage } from "@prisma/client";
import { RepositoryFactory } from "@/repositories/provider-factory";

export class ChatMessageService {
  private repo = RepositoryFactory.getChatMessageRepository();

  async getMessages(chatSessionId: string): Promise<ChatMessage[]> {
    return this.repo.findBySessionId(chatSessionId);
  }

  async addMessage(
    message: Omit<ChatMessage, "createdAt">,
  ): Promise<ChatMessage> {
    return this.repo.create(message);
  }
}
