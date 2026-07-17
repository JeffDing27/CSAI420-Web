import {
  AuditEvent,
  type AuthSession,
  type ChatMessage,
  type ChatSession,
  type ClinicianAccessRequest,
  type CoachResponse,
  type Consent,
  type ConsentedClinician,
  type CustomerReference,
  type Escalation,
  type OutboxEvent,
  type PushToken,
  type RagChunk,
  type RagDocument,
  type RapidStepTest,
  type SmsConsentMessage,
  type User,
  type VoiceSession,
  type VoiceTest,
} from "@prisma/client";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
}

export interface SessionRepository {
  findById(id: string): Promise<AuthSession | null>;
  findByTokenHash(tokenHash: string): Promise<AuthSession | null>;
  create(session: Omit<AuthSession, "id" | "createdAt">): Promise<AuthSession>;
  update(id: string, session: Partial<AuthSession>): Promise<AuthSession>;
  revoke(id: string): Promise<void>;
}

export interface CustomerReferenceRepository {
  findById(id: string): Promise<CustomerReference | null>;
  findByEmail(email: string): Promise<CustomerReference | null>;
  findByPhone(phone: string): Promise<CustomerReference | null>;
  create(
    customer: Omit<CustomerReference, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomerReference>;
  update(
    id: string,
    customer: Partial<CustomerReference>,
  ): Promise<CustomerReference>;
}

export interface ConsentRepository {
  findByCustomer(customer: string): Promise<Consent | null>;
  upsert(customer: string, status: boolean): Promise<Consent>;
}

export interface ConsentedClinicianRepository {
  findByCustomer(customer: string): Promise<ConsentedClinician[]>;
  add(customer: string, clinicianUsername: string): Promise<ConsentedClinician>;
}

export interface ClinicianAccessRequestRepository {
  findByCustomer(customerEmail: string): Promise<ClinicianAccessRequest[]>;
  create(
    request: Omit<ClinicianAccessRequest, "id" | "createdAt" | "updatedAt">,
  ): Promise<ClinicianAccessRequest>;
  updateStatus(id: string, status: string): Promise<ClinicianAccessRequest>;
  delete(customerEmail: string, clinicianUsername: string): Promise<boolean>;
}

export interface RapidStepTestRepository {
  findById(id: string): Promise<RapidStepTest | null>;
  findByUserId(userId: string): Promise<RapidStepTest[]>;
  create(test: Omit<RapidStepTest, "id" | "createdAt">): Promise<RapidStepTest>;
}

export interface EscalationRepository {
  findById(id: string): Promise<Escalation | null>;
  findAll(): Promise<Escalation[]>;
  create(
    escalation: Omit<Escalation, "createdAt" | "updatedAt">,
  ): Promise<Escalation>;
  update(id: string, escalation: Partial<Escalation>): Promise<Escalation>;
}

export interface ChatSessionRepository {
  findById(id: string): Promise<ChatSession | null>;
  upsert(
    session: Omit<ChatSession, "createdAt" | "updatedAt">,
  ): Promise<ChatSession>;
  delete(id: string): Promise<void>;
}

export interface ChatMessageRepository {
  create(message: Omit<ChatMessage, "id" | "createdAt">): Promise<ChatMessage>;
  findBySessionId(sessionId: string): Promise<ChatMessage[]>;
}

export interface CoachResponseRepository {
  create(
    response: Omit<CoachResponse, "id" | "createdAt">,
  ): Promise<CoachResponse>;
  findByEscalationId(escalationId: string): Promise<CoachResponse[]>;
}

export interface PushTokenRepository {
  findByToken(token: string): Promise<PushToken | null>;
  findByUserId(userId: string): Promise<PushToken[]>;
  upsert(userId: string, platform: string, token: string): Promise<PushToken>;
  deactivate(token: string): Promise<void>;
}

export interface VoiceRepository {
  findSessionByCallSid(callSid: string): Promise<VoiceSession | null>;
  createSession(
    session: Omit<VoiceSession, "id" | "createdAt" | "updatedAt">,
  ): Promise<VoiceSession>;
  updateSession(
    callSid: string,
    session: Partial<VoiceSession>,
  ): Promise<VoiceSession>;

  findTestByCallSid(callSid: string): Promise<VoiceTest | null>;
  createTest(test: Omit<VoiceTest, "id" | "createdAt">): Promise<VoiceTest>;
}

export interface SmsRepository {
  findByMessageSid(messageSid: string): Promise<SmsConsentMessage | null>;
  create(
    message: Omit<SmsConsentMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<SmsConsentMessage>;
  updateStatus(messageSid: string, status: string): Promise<SmsConsentMessage>;
}

export interface RagRepository {
  findDocuments(): Promise<RagDocument[]>;
  findChunks(embedding: any, limit: number): Promise<RagChunk[]>;
  // For mocks, we just provide an interface. Proper implementation will use pgvector.
}

export interface OutboxRepository {
  create(
    event: Omit<
      OutboxEvent,
      "id" | "createdAt" | "updatedAt" | "attempts" | "status"
    >,
  ): Promise<OutboxEvent>;
  findPendingAndLock(limit: number): Promise<OutboxEvent[]>;
  markCompleted(id: string): Promise<OutboxEvent>;
  markFailed(id: string, error: string): Promise<OutboxEvent>;
}
