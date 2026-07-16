import { RepositoryFactory } from "@/repositories/provider-factory";
import type { Escalation } from "@prisma/client";

export class EscalationService {
  private repo = RepositoryFactory.getEscalationRepository();

  async getEscalations(): Promise<Escalation[]> {
    return this.repo.findAll();
  }

  async getEscalation(id: string): Promise<Escalation | null> {
    return this.repo.findById(id);
  }

  async createEscalation(escalation: Omit<Escalation, "id" | "createdAt" | "updatedAt">): Promise<Escalation> {
    return this.repo.create(escalation);
  }

  async updateEscalationStatus(id: string, status: string): Promise<Escalation> {
    return this.repo.update(id, { status: status as any });
  }

  async updateEscalation(id: string, updates: Partial<Escalation>): Promise<Escalation> {
    return this.repo.update(id, updates);
  }
}
