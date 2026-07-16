import { RepositoryFactory } from "@/repositories/provider-factory";
import type { CoachResponse } from "@prisma/client";

export class CoachResponseService {
  private repo = RepositoryFactory.getCoachResponseRepository();

  async getResponses(escalationId: string): Promise<CoachResponse[]> {
    return this.repo.findByEscalationId(escalationId);
  }

  async addResponse(response: Omit<CoachResponse, "id" | "createdAt">): Promise<CoachResponse> {
    return this.repo.create(response);
  }
}
