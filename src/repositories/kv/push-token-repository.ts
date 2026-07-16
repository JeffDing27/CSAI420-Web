import { kvGet, kvSet } from "@/utils/kv-store";
import type { PushToken } from "@prisma/client";
import crypto from "crypto";
import type { PushTokenRepository } from "../interfaces";

export class KvPushTokenRepository implements PushTokenRepository {
  async findByToken(token: string): Promise<PushToken | null> {
    const data = await kvGet<PushToken>(`pushToken:${token}`);
    if (!data) return null;
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  async findByUserId(userId: string): Promise<PushToken[]> {
    const tokenStrings = await kvGet<string[]>(`userPushTokens:${userId}`) || [];
    const tokens: PushToken[] = [];
    for (const t of tokenStrings) {
      const token = await this.findByToken(t);
      if (token) tokens.push(token);
    }
    return tokens;
  }

  async upsert(userId: string, platform: string, token: string): Promise<PushToken> {
    let existing = await this.findByToken(token);
    
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      existing.active = true;
      existing.updatedAt = new Date();
    } else {
      existing = {
        id: crypto.randomUUID(),
        userId,
        platform,
        token,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    await kvSet(`pushToken:${token}`, existing);

    // add to user's list
    const userTokens = await kvGet<string[]>(`userPushTokens:${userId}`) || [];
    if (!userTokens.includes(token)) {
      userTokens.push(token);
      await kvSet(`userPushTokens:${userId}`, userTokens);
    }

    return existing;
  }

  async deactivate(token: string): Promise<void> {
    const existing = await this.findByToken(token);
    if (existing) {
      existing.active = false;
      existing.updatedAt = new Date();
      await kvSet(`pushToken:${token}`, existing);
    }
  }
}
