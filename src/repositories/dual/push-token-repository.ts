import type { PushToken } from "@prisma/client";
import type { PushTokenRepository } from "../interfaces";
import { KvPushTokenRepository } from "../kv/push-token-repository";
import { PrismaPushTokenRepository } from "../prisma/push-token-repository";

export class DualPushTokenRepository implements PushTokenRepository {
  private prismaRepo = new PrismaPushTokenRepository();
  private kvRepo = new KvPushTokenRepository();

  async findByToken(token: string): Promise<PushToken | null> {
    return this.prismaRepo.findByToken(token);
  }

  async findByUserId(userId: string): Promise<PushToken[]> {
    return this.prismaRepo.findByUserId(userId);
  }

  async upsert(userId: string, platform: string, token: string): Promise<PushToken> {
    const pushed = await this.prismaRepo.upsert(userId, platform, token);

    this.kvRepo.upsert(userId, platform, token).catch((e) => {
      console.error(
        "Failed secondary write to KV for push token:",
        token,
        e,
      );
    });

    return pushed;
  }

  async deactivate(token: string): Promise<void> {
    await this.prismaRepo.deactivate(token);

    this.kvRepo.deactivate(token).catch((e) => {
      console.error(
        "Failed secondary deactivate to KV for push token:",
        token,
        e,
      );
    });
  }
}
