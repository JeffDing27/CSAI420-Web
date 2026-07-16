export interface Escalation {
  escalationId: string;
  userId: string;
  sessionId: string;
  phoneNumber?: string;
  question: string;
  aiResponse: string;
  responsePreference: 'call' | 'text' | 'chat';
  priority: 'high' | 'medium' | 'low';
  category: 'medical' | 'technical' | 'general';
  status: 'escalated' | 'assigned' | 'resolved';
  escalationTimestamp: string;
  estimatedResponseTime: string;
}

import { kvGet, kvSet } from "./kv-store";

export async function addEscalation(escalation: Escalation): Promise<void> {
  await kvSet(`escalation:${escalation.escalationId}`, escalation);
  
  // Update index for listing
  const indexKey = 'escalationIndex';
  let index = (await kvGet<string[]>(indexKey)) || [];
  index.unshift(escalation.escalationId);
  await kvSet(indexKey, index);
}

export async function getEscalation(escalationId: string): Promise<Escalation | null> {
  return kvGet<Escalation>(`escalation:${escalationId}`);
}

export async function updateEscalationStatus(escalationId: string, status: Escalation['status']): Promise<void> {
  const esc = await getEscalation(escalationId);
  if (esc) {
    esc.status = status;
    await kvSet(`escalation:${escalationId}`, esc);
  }
}

export async function listEscalations(): Promise<Escalation[]> {
  const index = (await kvGet<string[]>('escalationIndex')) || [];
  const results: Escalation[] = [];
  for (const id of index) {
    const esc = await getEscalation(id);
    if (esc) results.push(esc);
  }
  return results;
}
