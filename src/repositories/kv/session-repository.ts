import type { AuthSession } from "@prisma/client";
import { randomUUID } from "crypto";
import type { SessionRepository } from "../interfaces";

export class KvSessionRepository implements SessionRepository {
  async findById(id: string): Promise<AuthSession | null> {
    return null; // KV didn't store sessions
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    return null;
  }

  async create(
    session: Omit<AuthSession, "id" | "createdAt">,
  ): Promise<AuthSession> {
    return {
      id: randomUUID(),
      ...session,
      createdAt: new Date(),
    };
  }

  async update(
    id: string,
    session: Partial<AuthSession>,
  ): Promise<AuthSession> {
    throw new Error("KV Session Update Not Implemented");
  }

  async revoke(id: string): Promise<void> {
    // No-op
  }
}
