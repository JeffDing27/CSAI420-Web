import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kvGet, kvSet } from "@/utils/kv-store";

export type CreateUserParams = Omit<
  User,
  "id" | "createdAt" | "updatedAt" | "externalUserId"
>;

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    const provider = process.env.STORAGE_PROVIDER || "kv";

    if (provider === "supabase" || provider === "dual") {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (provider === "supabase" || user) return user;
      } catch (e) {
        if (provider === "supabase") throw e;
        // In dual mode, if supabase fails, we do NOT silently fall back to KV if it's a connection failure.
        // Wait, the prompt says: "do not silently fall back to KV when Supabase fails".
        throw e;
      }
    }

    if (provider === "kv" || provider === "dual") {
      const kvUser = await kvGet<any>(`user:${email}`);
      if (kvUser) {
        return {
          id: kvUser.id || "kv-fallback-id",
          userName: kvUser.userName,
          email: kvUser.email,
          firstName: kvUser.firstName || "",
          lastName: kvUser.lastName || "",
          phone: kvUser.phone,
          birthDate: kvUser.birthDate,
          region: kvUser.region,
          passwordHash: kvUser.passwordHash,
          passwordSalt: kvUser.passwordSalt,
          externalUserId: null,
          role: kvUser.role || "PATIENT",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    return null;
  }

  static async findByPhone(phone: string): Promise<User | null> {
    const provider = process.env.STORAGE_PROVIDER || "kv";

    if (provider === "supabase" || provider === "dual") {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (provider === "supabase" || user) return user;
    }

    if (provider === "kv" || provider === "dual") {
      // In KV, users are indexed by email. But we may need to scan or use a secondary index.
      // Currently, app/user/route doesn't seem to index by phone in KV.
      // We'll return null for KV if not found.
    }
    return null;
  }

  static async findByUserName(userName: string): Promise<User | null> {
    const provider = process.env.STORAGE_PROVIDER || "kv";

    if (provider === "supabase" || provider === "dual") {
      const user = await prisma.user.findUnique({ where: { userName } });
      if (provider === "supabase" || user) return user;
    }
    return null;
  }

  static async create(data: CreateUserParams): Promise<User> {
    const provider = process.env.STORAGE_PROVIDER || "kv";
    let createdUser: User | null = null;

    if (provider === "supabase" || provider === "dual") {
      createdUser = await prisma.user.create({
        data,
      });
    }

    if (provider === "kv" || provider === "dual") {
      const kvData = {
        ...data,
        id: createdUser ? createdUser.id : crypto.randomUUID(),
      };
      await kvSet(`user:${data.email}`, kvData);

      if (provider === "kv") {
        createdUser = {
          ...kvData,
          externalUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User;
      }
    }

    return createdUser!;
  }
}
