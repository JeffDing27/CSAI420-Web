import type { AuthSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionRepository } from "../interfaces";

export class PrismaSessionRepository implements SessionRepository {
  async findById(id: string): Promise<AuthSession | null> {
    return prisma.authSession.findUnique({ where: { id } });
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    return prisma.authSession.findUnique({ where: { tokenHash } });
  }

  async create(
    session: Omit<AuthSession, "id" | "createdAt">,
  ): Promise<AuthSession> {
    return prisma.authSession.create({ data: session });
  }

  async update(
    id: string,
    session: Partial<AuthSession>,
  ): Promise<AuthSession> {
    return prisma.authSession.update({ where: { id }, data: session });
  }

  async revoke(id: string): Promise<void> {
    await prisma.authSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
