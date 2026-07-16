import { DualSessionRepository } from "./dual/session-repository";
import { DualUserRepository } from "./dual/user-repository";
import { PrismaCustomerReferenceRepository } from "./prisma/customer-reference-repository";
import { KvCustomerReferenceRepository } from "./kv/customer-reference-repository";
import { DualCustomerReferenceRepository } from "./dual/customer-reference-repository";
import {
  ChatSessionRepository,
  ClinicianAccessRequestRepository,
  ConsentedClinicianRepository,
  ConsentRepository,
  CustomerReferenceRepository,
  EscalationRepository,
  OutboxRepository,
  PushTokenRepository,
  RagRepository,
  RapidStepTestRepository,
  type SessionRepository,
  SmsRepository,
  type UserRepository,
  VoiceRepository,
  ChatMessageRepository,
  CoachResponseRepository,
} from "./interfaces";
import { KvSessionRepository } from "./kv/session-repository";
import { KvUserRepository } from "./kv/user-repository";
import { PrismaSessionRepository } from "./prisma/session-repository";
import { PrismaUserRepository } from "./prisma/user-repository";
import { PrismaRapidStepTestRepository } from "./prisma/rapid-step-test-repository";
import { KvRapidStepTestRepository } from "./kv/rapid-step-test-repository";
import { DualRapidStepTestRepository } from "./dual/rapid-step-test-repository";
import { PrismaConsentRepository } from "./prisma/consent-repository";
import { KvConsentRepository } from "./kv/consent-repository";
import { DualConsentRepository } from "./dual/consent-repository";
import { PrismaConsentedClinicianRepository } from "./prisma/consented-clinician-repository";
import { KvConsentedClinicianRepository } from "./kv/consented-clinician-repository";
import { DualConsentedClinicianRepository } from "./dual/consented-clinician-repository";
import { PrismaClinicianAccessRequestRepository } from "./prisma/clinician-access-request-repository";
import { KvClinicianAccessRequestRepository } from "./kv/clinician-access-request-repository";
import { DualClinicianAccessRequestRepository } from "./dual/clinician-access-request-repository";
import { PrismaPushTokenRepository } from "./prisma/push-token-repository";
import { KvPushTokenRepository } from "./kv/push-token-repository";
import { DualPushTokenRepository } from "./dual/push-token-repository";
import { PrismaEscalationRepository } from "./prisma/escalation-repository";
import { KvEscalationRepository } from "./kv/escalation-repository";
import { DualEscalationRepository } from "./dual/escalation-repository";
import { PrismaCoachResponseRepository } from "./prisma/coach-response-repository";
import { KvCoachResponseRepository } from "./kv/coach-response-repository";
import { DualCoachResponseRepository } from "./dual/coach-response-repository";
import { PrismaChatSessionRepository } from "./prisma/chat-session-repository";
import { KvChatSessionRepository } from "./kv/chat-session-repository";
import { DualChatSessionRepository } from "./dual/chat-session-repository";
import { PrismaChatMessageRepository } from "./prisma/chat-message-repository";
import { KvChatMessageRepository } from "./kv/chat-message-repository";
import { DualChatMessageRepository } from "./dual/chat-message-repository";

export type StorageMode = "supabase" | "kv" | "dual";

export class RepositoryFactory {
  private static getMode(): StorageMode {
    const mode = process.env.STORAGE_PROVIDER as StorageMode;
    if (!["supabase", "kv", "dual"].includes(mode)) {
      console.warn(`Invalid STORAGE_PROVIDER '${mode}'. Defaulting to 'kv'.`);
      return "kv";
    }
    return mode;
  }

  static getUserRepository(): UserRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaUserRepository();
      case "kv":
        return new KvUserRepository();
      case "dual":
        return new DualUserRepository();
      default:
        return new PrismaUserRepository(); // Fallback for now until KV implemented
    }
  }

  static getSessionRepository(): SessionRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaSessionRepository();
      case "kv":
        return new KvSessionRepository();
      case "dual":
        return new DualSessionRepository();
      default:
        return new PrismaSessionRepository();
    }
  }

  static getRapidStepTestRepository(): RapidStepTestRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaRapidStepTestRepository();
      case "kv":
        return new KvRapidStepTestRepository();
      case "dual":
        return new DualRapidStepTestRepository();
      default:
        return new PrismaRapidStepTestRepository();
    }
  }

  static getConsentRepository(): ConsentRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaConsentRepository();
      case "kv":
        return new KvConsentRepository();
      case "dual":
        return new DualConsentRepository();
      default:
        return new PrismaConsentRepository();
    }
  }

  static getConsentedClinicianRepository(): ConsentedClinicianRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaConsentedClinicianRepository();
      case "kv":
        return new KvConsentedClinicianRepository();
      case "dual":
        return new DualConsentedClinicianRepository();
      default:
        return new PrismaConsentedClinicianRepository();
    }
  }

  static getClinicianAccessRequestRepository(): ClinicianAccessRequestRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaClinicianAccessRequestRepository();
      case "kv":
        return new KvClinicianAccessRequestRepository();
      case "dual":
        return new DualClinicianAccessRequestRepository();
      default:
        return new PrismaClinicianAccessRequestRepository();
    }
  }

  static getCustomerReferenceRepository(): CustomerReferenceRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaCustomerReferenceRepository();
      case "kv":
        return new KvCustomerReferenceRepository();
      case "dual":
        return new DualCustomerReferenceRepository();
      default:
        return new PrismaCustomerReferenceRepository();
    }
  }

  static getPushTokenRepository(): PushTokenRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaPushTokenRepository();
      case "kv":
        return new KvPushTokenRepository();
      case "dual":
        return new DualPushTokenRepository();
      default:
        return new PrismaPushTokenRepository();
    }
  }

  static getEscalationRepository(): EscalationRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaEscalationRepository();
      case "kv":
        return new KvEscalationRepository();
      case "dual":
        return new DualEscalationRepository();
      default:
        return new PrismaEscalationRepository();
    }
  }

  static getCoachResponseRepository(): CoachResponseRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaCoachResponseRepository();
      case "kv":
        return new KvCoachResponseRepository();
      case "dual":
        return new DualCoachResponseRepository();
      default:
        return new PrismaCoachResponseRepository();
    }
  }

  static getChatSessionRepository(): ChatSessionRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaChatSessionRepository();
      case "kv":
        return new KvChatSessionRepository();
      case "dual":
        return new DualChatSessionRepository();
      default:
        return new PrismaChatSessionRepository();
    }
  }

  static getChatMessageRepository(): ChatMessageRepository {
    const mode = RepositoryFactory.getMode();
    switch (mode) {
      case "supabase":
        return new PrismaChatMessageRepository();
      case "kv":
        return new KvChatMessageRepository();
      case "dual":
        return new DualChatMessageRepository();
      default:
        return new PrismaChatMessageRepository();
    }
  }

  // TODO: Add factory methods for all other repositories
}
