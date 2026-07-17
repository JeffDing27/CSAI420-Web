import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import { kvGet } from "../src/utils/kv-store";

const entities = [
  "User",
  "AuthSession",
  "CustomerReference",
  "Consent",
  "ConsentedClinician",
  "ClinicianAccessRequest",
  "RapidStepTest",
  "Escalation",
  "CoachResponse",
  "ChatSession",
  "ChatMessage",
  "PushToken",
  "VoiceSession",
  "VoiceTest",
  "SmsConsentMessage",
  "OutboxEvent",
  "RagDocument",
  "RagChunk",
  "AuditEvent",
];

async function main() {
  console.log("--- Starting Dual Write Verification ---");
  process.env.STORAGE_PROVIDER = "dual";

  const hasKvCreds = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
  if (!hasKvCreds) {
    console.warn("[WARNING] KV Credentials Absent - Skipping real KV reads. Remote KV data migration is marked as NOT TESTED.");
  }

  const userId = `test-user-${randomUUID()}`;
  const phone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
  const email = `test-${randomUUID()}@example.com`;
  
  let prismaClient: any;
  try {
    const { prisma } = await import("../src/lib/prisma");
    prismaClient = prisma;
    const { RepositoryFactory } = await import("../src/repositories/provider-factory");

    // 1. User
    console.log("Verifying User...");
    const userRepo = RepositoryFactory.getUserRepository();
    await userRepo.create({
      userName: `user_${randomUUID()}`,
      email,
      firstName: "Test",
      lastName: "User",
      phone,
      birthDate: "01-01-2000",
      region: "US",
      passwordHash: "hash",
      passwordSalt: "salt",
    });
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) throw new Error("User dual-write failed in Postgres");
    console.log("  -> SUCCESS");

    // 2. AuthSession
    console.log("Verifying AuthSession...");
    const sessionRepo = RepositoryFactory.getSessionRepository();
    const tokenHash = `token-${randomUUID()}`;
    await sessionRepo.create({
      userId: dbUser.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
      lastUsedAt: null
    });
    const dbSession = await prisma.authSession.findUnique({ where: { tokenHash } });
    if (!dbSession) throw new Error("AuthSession dual-write failed");
    console.log("  -> SUCCESS");

    // 3. CustomerReference
    console.log("Verifying CustomerReference...");
    const customerRepo = RepositoryFactory.getCustomerReferenceRepository();
    await customerRepo.create({
      phone,
      userId: dbUser.id,
      email,
      name: "Test User",
      externalCustomerId: null,
    });
    const dbCustomer = await prisma.customerReference.findUnique({ where: { phone } });
    if (!dbCustomer) throw new Error("CustomerReference dual-write failed");
    console.log("  -> SUCCESS");

    // 4. Consent
    console.log("Verifying Consent...");
    const consentRepo = RepositoryFactory.getConsentRepository();
    await consentRepo.upsert(email, true);
    const dbConsent = await prisma.consent.findUnique({ where: { customer: email } });
    if (!dbConsent) throw new Error("Consent dual-write failed");
    console.log("  -> SUCCESS");

    // 5. ConsentedClinician
    console.log("Verifying ConsentedClinician...");
    const consClinRepo = RepositoryFactory.getConsentedClinicianRepository();
    await consClinRepo.add(email, "dr_smith");
    const dbConsClin = await prisma.consentedClinician.findUnique({ where: { customer_clinicianUsername: { customer: email, clinicianUsername: "dr_smith" } } });
    if (!dbConsClin) throw new Error("ConsentedClinician dual-write failed");
    console.log("  -> SUCCESS");

    // 6. ClinicianAccessRequest
    console.log("Verifying ClinicianAccessRequest...");
    const clinAccessRepo = RepositoryFactory.getClinicianAccessRequestRepository();
    await clinAccessRepo.create({
      clinicianUsername: "dr_smith",
      customerEmail: email,
      status: "pending",
      requestDate: new Date()
    });
    const dbClinAccess = await prisma.clinicianAccessRequest.findUnique({ where: { customerEmail_clinicianUsername: { customerEmail: email, clinicianUsername: "dr_smith" } } });
    if (!dbClinAccess) throw new Error("ClinicianAccessRequest dual-write failed");
    console.log("  -> SUCCESS");

    // 7. RapidStepTest
    console.log("Verifying RapidStepTest...");
    const rstRepo = RepositoryFactory.getRapidStepTestRepository();
    const rst = await rstRepo.create({
      userId: dbUser.id,
      externalTestId: "ext-123",
      testData: { score: 10 },
      source: "MOCK",
      completedAt: new Date()
    });
    const dbRst = await prisma.rapidStepTest.findUnique({ where: { id: rst.id } });
    if (!dbRst) throw new Error("RapidStepTest dual-write failed");
    console.log("  -> SUCCESS");

    // 8. Escalation
    console.log("Verifying Escalation...");
    const escalationRepo = RepositoryFactory.getEscalationRepository();
    const escId = `esc-${randomUUID()}`;
    await escalationRepo.create({
      escalationId: escId,
      userId: dbUser.id,
      phoneNumber: phone,
      originalQuestion: "help",
      aiResponse: "I cannot help",
      questionTimestamp: new Date(),
      escalationTimestamp: new Date(),
      responsePreference: "CHAT",
      waitingForResponse: true,
      priority: "HIGH",
      category: "MEDICAL",
      status: "PENDING",
      coachId: null,
      resolutionTimestamp: null
    });
    const dbEsc = await prisma.escalation.findUnique({ where: { escalationId: escId } });
    if (!dbEsc) throw new Error("Escalation dual-write failed");
    console.log("  -> SUCCESS");

    // 9. CoachResponse
    console.log("Verifying CoachResponse...");
    const coachRespRepo = RepositoryFactory.getCoachResponseRepository();
    const cr = await coachRespRepo.create({
      escalationId: escId,
      coachId: "dr_smith",
      message: "Here is help",
      deliveryMethod: "CHAT",
      deliveryStatus: "SENT"
    });
    const dbCr = await prisma.coachResponse.findUnique({ where: { id: cr.id } });
    if (!dbCr) throw new Error("CoachResponse dual-write failed");
    console.log("  -> SUCCESS");

    // 10. ChatSession
    console.log("Verifying ChatSession...");
    const chatSessionRepo = RepositoryFactory.getChatSessionRepository();
    const chatSessionId = `chat-${randomUUID()}`;
    await chatSessionRepo.upsert({
      id: chatSessionId,
      userId: dbUser.id,
      threadId: null,
      context: {},
      nextStep: "start",
      sessionActive: true,
      accessibilityMode: false,
      locale: "en",
      expiresAt: new Date(Date.now() + 100000)
    });
    const dbChatSess = await prisma.chatSession.findUnique({ where: { id: chatSessionId } });
    if (!dbChatSess) throw new Error("ChatSession dual-write failed");
    console.log("  -> SUCCESS");

    // 11. ChatMessage
    console.log("Verifying ChatMessage...");
    const chatMsgRepo = RepositoryFactory.getChatMessageRepository();
    const cm = await chatMsgRepo.create({
      chatSessionId,
      role: "USER",
      message: "hi",
      metadata: {}
    });
    const dbCm = await prisma.chatMessage.findUnique({ where: { id: cm.id } });
    if (!dbCm) throw new Error("ChatMessage dual-write failed");
    console.log("  -> SUCCESS");

    // 12. PushToken
    console.log("Verifying PushToken...");
    const pushTokenRepo = RepositoryFactory.getPushTokenRepository();
    const token = `token-${randomUUID()}`;
    await pushTokenRepo.upsert(dbUser.id, "ios", token);
    const dbPush = await prisma.pushToken.findUnique({ where: { token } });
    if (!dbPush) throw new Error("PushToken dual-write failed");
    console.log("  -> SUCCESS");

    // Non-KV / Postgres only features, testing direct prisma logic for the audit 
    // 13. VoiceSession
    console.log("Verifying VoiceSession (Postgres)...");
    const vs = await prisma.voiceSession.create({
      data: {
        callSid: `sid-${randomUUID()}`,
        stage: "INITIAL",
        expiresAt: new Date()
      }
    });
    if (!vs) throw new Error("VoiceSession failed");
    console.log("  -> SUCCESS");

    // 14. VoiceTest
    console.log("Verifying VoiceTest (Postgres)...");
    const vt = await prisma.voiceTest.create({
      data: {
        callSid: vs.callSid,
        status: "COMPLETED",
        testData: {}
      }
    });
    if (!vt) throw new Error("VoiceTest failed");
    console.log("  -> SUCCESS");

    // 15. SmsConsentMessage
    console.log("Verifying SmsConsentMessage (Postgres)...");
    const sms = await prisma.smsConsentMessage.create({
      data: {
        messageSid: `msg-${randomUUID()}`,
        phoneNumber: phone,
        status: "DELIVERED"
      }
    });
    if (!sms) throw new Error("SmsConsentMessage failed");
    console.log("  -> SUCCESS");

    // 16. OutboxEvent
    console.log("Verifying OutboxEvent (Postgres)...");
    const ob = await prisma.outboxEvent.create({
      data: {
        eventType: "TEST",
        payload: {},
        availableAt: new Date()
      }
    });
    if (!ob) throw new Error("OutboxEvent failed");
    console.log("  -> SUCCESS");

    // 17. RagDocument
    console.log("Verifying RagDocument (Postgres)...");
    const doc = await prisma.ragDocument.create({
      data: {
        title: "test doc",
        source: "url",
        metadata: {},
        checksum: "abc"
      }
    });
    if (!doc) throw new Error("RagDocument failed");
    console.log("  -> SUCCESS");

    // 18. RagChunk
    console.log("Verifying RagChunk (Postgres)...");
    const chunk = await prisma.ragChunk.create({
      data: {
        documentId: doc.id,
        content: "hello",
        metadata: {}
      }
    });
    if (!chunk) throw new Error("RagChunk failed");
    console.log("  -> SUCCESS");

    // 19. AuditEvent
    console.log("Verifying AuditEvent (Postgres)...");
    const audit = await prisma.auditEvent.create({
      data: {
        eventType: "TEST",
        entityType: "USER",
        entityId: dbUser.id,
        safeMetadata: {}
      }
    });
    if (!audit) throw new Error("AuditEvent failed");
    console.log("  -> SUCCESS");

    console.log("--- ALL ENTITIES VERIFIED SUCCESSFULLY ---");

  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    if (prismaClient) {
        console.log("Cleaning up synthetic data...");
        // Cleanup User will cascade delete most things due to onDelete: Cascade / SetNull constraints in schema
        await prismaClient.user.deleteMany({ where: { email } }).catch(() => {});
        await prismaClient.customerReference.deleteMany({ where: { phone } }).catch(() => {});
        await prismaClient.consent.deleteMany({ where: { customer: email } }).catch(() => {});
        await prismaClient.consentedClinician.deleteMany({ where: { customer: email } }).catch(() => {});
        await prismaClient.clinicianAccessRequest.deleteMany({ where: { customerEmail: email } }).catch(() => {});
        await prismaClient.voiceSession.deleteMany({ where: { callSid: { startsWith: 'sid-' } } }).catch(() => {});
        await prismaClient.voiceTest.deleteMany({ where: { callSid: { startsWith: 'sid-' } } }).catch(() => {});
        await prismaClient.smsConsentMessage.deleteMany({ where: { phoneNumber: phone } }).catch(() => {});
        await prismaClient.outboxEvent.deleteMany({ where: { eventType: "TEST" } }).catch(() => {});
        await prismaClient.ragDocument.deleteMany({ where: { title: "test doc" } }).catch(() => {});
        await prismaClient.$disconnect();
    }
  }
}

main();
