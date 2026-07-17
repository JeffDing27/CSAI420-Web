import type { SmsConsentMessage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class SmsConsentMessageRepository {
  async findByMessageSid(
    messageSid: string,
  ): Promise<SmsConsentMessage | null> {
    return prisma.smsConsentMessage.findUnique({
      where: { messageSid },
    });
  }

  async upsert(
    msg: Omit<SmsConsentMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<SmsConsentMessage> {
    return prisma.smsConsentMessage.upsert({
      where: { messageSid: msg.messageSid },
      update: {
        userId: msg.userId,
        phoneNumber: msg.phoneNumber,
        status: msg.status,
        simulated: msg.simulated,
      },
      create: {
        messageSid: msg.messageSid,
        userId: msg.userId,
        phoneNumber: msg.phoneNumber,
        status: msg.status,
        simulated: msg.simulated,
      },
    });
  }
}
