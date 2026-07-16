import type { CoachResponse } from "@prisma/client";
import type { CoachResponseRepository } from "../interfaces";
import { KvCoachResponseRepository } from "../kv/coach-response-repository";
import { PrismaCoachResponseRepository } from "../prisma/coach-response-repository";

export class DualCoachResponseRepository implements CoachResponseRepository {
  private prismaRepo = new PrismaCoachResponseRepository();
  private kvRepo = new KvCoachResponseRepository();

  async findByEscalationId(escalationId: string): Promise<CoachResponse[]> {
    return this.prismaRepo.findByEscalationId(escalationId);
  }

  async create(
    response: Omit<CoachResponse, "id" | "createdAt">,
  ): Promise<CoachResponse> {
    const created = await this.prismaRepo.create(response);

    this.kvRepo.create(response).catch((e) => {
      console.error(
        "Failed secondary write to KV for coach response:",
        response.escalationId,
        e,
      );
    });

    return created;
  }
}
