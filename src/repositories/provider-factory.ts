import {
  type ChatMessageRepository,
  type ChatSessionRepository,
  type ClinicianAccessRequestRepository,
  type CoachResponseRepository,
  type ConsentedClinicianRepository,
  type ConsentRepository,
  type CustomerReferenceRepository,
  type EscalationRepository,
  OutboxRepository,
  type PushTokenRepository,
  RagRepository,
  type RapidStepTestRepository,
  type SessionRepository,
  SmsRepository,
  type UserRepository,
  VoiceRepository,
} from "./interfaces";
import { PrismaChatMessageRepository } from "./prisma/chat-message-repository";
import { PrismaChatSessionRepository } from "./prisma/chat-session-repository";
import { PrismaClinicianAccessRequestRepository } from "./prisma/clinician-access-request-repository";
import { PrismaCoachResponseRepository } from "./prisma/coach-response-repository";
import { PrismaConsentRepository } from "./prisma/consent-repository";
import { PrismaConsentedClinicianRepository } from "./prisma/consented-clinician-repository";
import { PrismaCustomerReferenceRepository } from "./prisma/customer-reference-repository";
import { PrismaEscalationRepository } from "./prisma/escalation-repository";
import { PrismaPushTokenRepository } from "./prisma/push-token-repository";
import { PrismaRapidStepTestRepository } from "./prisma/rapid-step-test-repository";
import { PrismaSessionRepository } from "./prisma/session-repository";
import { PrismaUserRepository } from "./prisma/user-repository";
import { RagRepository as PrismaRagRepository } from "./prisma/rag-repository";

export type StorageMode = "supabase";

export class RepositoryFactory {
  static getUserRepository(): UserRepository {
    return new PrismaUserRepository();
  }

  static getSessionRepository(): SessionRepository {
    return new PrismaSessionRepository();
  }

  static getRapidStepTestRepository(): RapidStepTestRepository {
    return new PrismaRapidStepTestRepository();
  }

  static getConsentRepository(): ConsentRepository {
    return new PrismaConsentRepository();
  }

  static getConsentedClinicianRepository(): ConsentedClinicianRepository {
    return new PrismaConsentedClinicianRepository();
  }

  static getClinicianAccessRequestRepository(): ClinicianAccessRequestRepository {
    return new PrismaClinicianAccessRequestRepository();
  }

  static getCustomerReferenceRepository(): CustomerReferenceRepository {
    return new PrismaCustomerReferenceRepository();
  }

  static getPushTokenRepository(): PushTokenRepository {
    return new PrismaPushTokenRepository();
  }

  static getEscalationRepository(): EscalationRepository {
    return new PrismaEscalationRepository();
  }

  static getCoachResponseRepository(): CoachResponseRepository {
    return new PrismaCoachResponseRepository();
  }

  static getChatSessionRepository(): ChatSessionRepository {
    return new PrismaChatSessionRepository();
  }

  static getChatMessageRepository(): ChatMessageRepository {
    return new PrismaChatMessageRepository();
  }

  static getRagRepository(): RagRepository {
    return new PrismaRagRepository();
  }
}
