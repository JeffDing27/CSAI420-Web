import { kvGet, kvSet } from "@/utils/kv-store";
import type { CoachResponse } from "@prisma/client";
import crypto from "crypto";
import type { CoachResponseRepository } from "../interfaces";

export class KvCoachResponseRepository implements CoachResponseRepository {
  async findByEscalationId(escalationId: string): Promise<CoachResponse[]> {
    const data = await kvGet<CoachResponse[]>(`coachResponses:${escalationId}`);
    if (!data) return [];
    return data.map((d) => ({
      ...d,
      createdAt: new Date(d.createdAt),
    }));
  }

  async create(
    response: Omit<CoachResponse, "id" | "createdAt">,
  ): Promise<CoachResponse> {
    const list = await this.findByEscalationId(response.escalationId);
    
    const newRes: CoachResponse = {
      ...response,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    list.push(newRes);
    await kvSet(`coachResponses:${response.escalationId}`, list);
    
    return newRes;
  }
}
