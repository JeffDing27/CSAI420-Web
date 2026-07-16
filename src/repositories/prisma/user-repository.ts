import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UserRepository } from "../interfaces";

export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { userName: username.toLowerCase() },
    });
  }

  async create(
    user: Omit<User, "id" | "createdAt" | "updatedAt">,
  ): Promise<User> {
    return prisma.user.create({
      data: {
        ...user,
        email: user.email.toLowerCase(),
        userName: user.userName.toLowerCase(),
      },
    });
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const data = { ...user };
    if (data.email) data.email = data.email.toLowerCase();
    if (data.userName) data.userName = data.userName.toLowerCase();

    return prisma.user.update({
      where: { id },
      data,
    });
  }
}
