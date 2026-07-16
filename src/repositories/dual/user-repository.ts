import type { User } from "@prisma/client";
import type { UserRepository } from "../interfaces";
import { KvUserRepository } from "../kv/user-repository";
import { PrismaUserRepository } from "../prisma/user-repository";

export class DualUserRepository implements UserRepository {
  private prismaRepo = new PrismaUserRepository();
  private kvRepo = new KvUserRepository();

  async findById(id: string): Promise<User | null> {
    return this.prismaRepo.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prismaRepo.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prismaRepo.findByPhone(phone);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prismaRepo.findByUsername(username);
  }

  async create(
    user: Omit<User, "id" | "createdAt" | "updatedAt">,
  ): Promise<User> {
    // Write to Supabase first
    const createdUser = await this.prismaRepo.create(user);

    // Secondary write to KV
    this.kvRepo.create({ ...user, id: createdUser.id } as any).catch((e) => {
      console.error("Failed secondary write to KV for user:", user.email, e);
    });

    return createdUser;
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const updatedUser = await this.prismaRepo.update(id, user);

    this.kvRepo.update(id, user).catch((e) => {
      console.error("Failed secondary update to KV for user:", id, e);
    });

    return updatedUser;
  }
}
