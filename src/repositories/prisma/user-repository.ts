import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UserRepository } from "../interfaces";

export function birthDateVariants(birthDate: string): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return [birthDate];

  const [, year, paddedMonth, paddedDay] = match;
  const month = String(Number(paddedMonth));
  const day = String(Number(paddedDay));

  return [
    birthDate,
    `${paddedMonth}/${paddedDay}/${year}`,
    `${month}/${day}/${year}`,
    `${paddedMonth}-${paddedDay}-${year}`,
    `${month}-${day}-${year}`,
    `${paddedMonth}${paddedDay}${year}`,
    `${month}${paddedDay}${year}`,
    `${paddedMonth}${day}${year}`,
    `${month}${day}${year}`,
    `${year}/${paddedMonth}/${paddedDay}`,
    `${year}${paddedMonth}${paddedDay}`,
  ];
}

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

  async findByBirthDate(birthDate: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { birthDate: { in: birthDateVariants(birthDate) } },
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
