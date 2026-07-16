import { EscalationService } from "@/services/escalation.service";

export interface Escalation {
  escalationId: string;
  userId: string;
  sessionId: string;
  phoneNumber?: string;
  question: string;
  aiResponse: string;
  responsePreference: "call" | "text" | "chat";
  priority: "high" | "medium" | "low";
  category: "medical" | "technical" | "general";
  status: "escalated" | "assigned" | "resolved";
  escalationTimestamp: string;
  estimatedResponseTime: string;
}

const service = new EscalationService();

function mapFromPrisma(esc: any): Escalation {
  return {
    ...esc,
    escalationTimestamp: esc.escalationTimestamp.toISOString(),
  };
}

export async function addEscalation(escalation: Escalation): Promise<void> {
  await service.createEscalation({
    ...escalation,
    escalationTimestamp: new Date(escalation.escalationTimestamp),
  } as any);
}

export async function getEscalation(
  escalationId: string,
): Promise<Escalation | null> {
  const esc = await service.getEscalation(escalationId);
  if (!esc) return null;
  return mapFromPrisma(esc);
}

export async function updateEscalationStatus(
  escalationId: string,
  status: Escalation["status"],
): Promise<void> {
  await service.updateEscalationStatus(escalationId, status);
}

export async function listEscalations(): Promise<Escalation[]> {
  const escs = await service.getEscalations();
  return escs.map(mapFromPrisma);
}
