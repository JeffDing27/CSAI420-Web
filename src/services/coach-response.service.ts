import type { CoachResponse } from "@prisma/client";
import { RepositoryFactory } from "@/repositories/provider-factory";

export class CoachResponseService {
  private repo = RepositoryFactory.getCoachResponseRepository();

  async getResponses(escalationId: string): Promise<CoachResponse[]> {
    return this.repo.findByEscalationId(escalationId);
  }

  async addResponse(
    response: Omit<CoachResponse, "id" | "createdAt">,
  ): Promise<CoachResponse> {
    return this.repo.create(response);
  }
}
