import { prisma } from "@/lib/prisma";
import type { PushToken } from "@prisma/client";
import type { PushTokenRepository } from "../interfaces";

export class PrismaPushTokenRepository implements PushTokenRepository {
  async findByToken(token: string): Promise<PushToken | null> {
    return prisma.pushToken.findUnique({ where: { token } });
  }

  async findByUserId(userId: string): Promise<PushToken[]> {
    return prisma.pushToken.findMany({ where: { userId } });
  }

  async upsert(userId: string, platform: string, token: string): Promise<PushToken> {
    return prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform, active: true },
      create: { userId, platform, token, active: true },
    });
  }

  async deactivate(token: string): Promise<void> {
    await prisma.pushToken.updateMany({
      where: { token },
      data: { active: false },
    });
  }
}
