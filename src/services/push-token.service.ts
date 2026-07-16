import { RepositoryFactory } from "@/repositories/provider-factory";
import type { PushToken } from "@prisma/client";

export class PushTokenService {
  private repo = RepositoryFactory.getPushTokenRepository();

  async registerToken(userId: string, platform: string, token: string): Promise<PushToken> {
    return this.repo.upsert(userId, platform, token);
  }

  async deactivateToken(token: string): Promise<void> {
    await this.repo.deactivate(token);
  }

  async getUserTokens(userId: string): Promise<PushToken[]> {
    return this.repo.findByUserId(userId);
  }
}
