export interface ChatSession {
  sessionId: string;
  sessionActive: boolean;
  nextStep: string;
  collectedFields: Record<string, string>;
  conversationContext: string[];
  lastUpdatedAt: string;
}

import { kvGet, kvSet } from "./kv-store";

export async function createChatSession(sessionId: string): Promise<ChatSession> {
  const session: ChatSession = {
    sessionId,
    sessionActive: true,
    nextStep: 'greeting',
    collectedFields: {},
    conversationContext: [],
    lastUpdatedAt: new Date().toISOString()
  };
  await kvSet(`chat:${sessionId}`, session);
  return session;
}

export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  return kvGet<ChatSession>(`chat:${sessionId}`);
}

export async function updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
  const session = await getChatSession(sessionId);
  if (!session) return null;
  
  const updated = {
    ...session,
    ...updates,
    lastUpdatedAt: new Date().toISOString()
  };
  
  await kvSet(`chat:${sessionId}`, updated);
  return updated;
}
