import type { AuthSession } from "@prisma/client";
import type { SessionRepository } from "../interfaces";
import { KvSessionRepository } from "../kv/session-repository";
import { PrismaSessionRepository } from "../prisma/session-repository";

export class DualSessionRepository implements SessionRepository {
  private prismaRepo = new PrismaSessionRepository();
  private kvRepo = new KvSessionRepository();

  async findById(id: string): Promise<AuthSession | null> {
    return this.prismaRepo.findById(id); // KV doesn't store it
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    return this.prismaRepo.findByTokenHash(tokenHash);
  }

  async create(
    session: Omit<AuthSession, "id" | "createdAt">,
  ): Promise<AuthSession> {
    const createdSession = await this.prismaRepo.create(session);
    // KV is no-op
    return createdSession;
  }

  async update(
    id: string,
    session: Partial<AuthSession>,
  ): Promise<AuthSession> {
    return this.prismaRepo.update(id, session);
  }

  async revoke(id: string): Promise<void> {
    return this.prismaRepo.revoke(id);
  }
}
