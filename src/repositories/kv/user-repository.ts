import type { User } from "@prisma/client";
import { randomUUID } from "crypto";
import { kvGet, kvSet } from "@/utils/kv-store";
import type { UserRepository } from "../interfaces";

export class KvUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    // KV currently only indexes by email.
    // If we need to find by ID in KV, we'd have to scan, which isn't supported.
    console.warn("KvUserRepository.findById is not supported optimally");
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const key = `user:${email.toLowerCase()}`;
    const data = await kvGet<any>(key);
    if (!data) return null;
    return {
      id: data.id || randomUUID(),
      userName: data.email.toLowerCase(), // In KV, email was often used as username
      email: data.email.toLowerCase(),
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || "",
      birthDate: data.birthDate || "",
      region: data.region || "US",
      passwordHash: data.password || "",
      passwordSalt: data.salt || "",
      externalUserId: data.externalUserId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async findByPhone(phone: string): Promise<User | null> {
    console.warn("KvUserRepository.findByPhone is not supported optimally");
    return null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findByEmail(username);
  }

  async create(
    user: Omit<User, "id" | "createdAt" | "updatedAt">,
  ): Promise<User> {
    const key = `user:${user.email.toLowerCase()}`;
    const id = randomUUID();
    const kvUser = {
      ...user,
      id,
      password: user.passwordHash,
      salt: user.passwordSalt,
    };
    await kvSet(key, kvUser);
    return { ...user, id, createdAt: new Date(), updatedAt: new Date() };
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    if (!user.email) throw new Error("Email required to update user in KV");
    const key = `user:${user.email.toLowerCase()}`;
    const existing = await kvGet<any>(key);
    const updated = { ...existing, ...user };
    await kvSet(key, updated);
    return updated as User;
  }
}
