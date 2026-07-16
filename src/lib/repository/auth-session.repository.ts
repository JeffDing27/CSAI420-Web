import type { AuthSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kvGet, kvSet } from "@/utils/kv-store";

export type CreateAuthSessionParams = Omit<
  AuthSession,
  "id" | "createdAt" | "lastUsedAt"
>;

export class AuthSessionRepository {
  static async create(data: CreateAuthSessionParams): Promise<AuthSession> {
    const provider = process.env.STORAGE_PROVIDER || "kv";
    let createdSession: AuthSession | null = null;

    if (provider === "supabase" || provider === "dual") {
      createdSession = await prisma.authSession.create({
        data,
      });
    }

    if (provider === "kv" || provider === "dual") {
      const kvData = {
        ...data,
        id: createdSession ? createdSession.id : crypto.randomUUID(),
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };
      await kvSet(`session:${data.tokenHash}`, kvData);

      if (provider === "kv") {
        createdSession = kvData as AuthSession;
      }
    }

    return createdSession!;
  }

  static async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const provider = process.env.STORAGE_PROVIDER || "kv";

    if (provider === "supabase" || provider === "dual") {
      const session = await prisma.authSession.findUnique({
        where: { tokenHash },
      });
      if (provider === "supabase" || session) return session;
    }

    if (provider === "kv" || provider === "dual") {
      const kvSession = await kvGet<AuthSession>(`session:${tokenHash}`);
      if (kvSession) return kvSession;
    }

    return null;
  }

  static async revoke(tokenHash: string): Promise<void> {
    const provider = process.env.STORAGE_PROVIDER || "kv";

    if (provider === "supabase" || provider === "dual") {
      await prisma.authSession.update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    }

    if (provider === "kv" || provider === "dual") {
      const kvSession = await kvGet<AuthSession>(`session:${tokenHash}`);
      if (kvSession) {
        kvSession.revokedAt = new Date();
        await kvSet(`session:${tokenHash}`, kvSession);
      }
    }
  }
}
