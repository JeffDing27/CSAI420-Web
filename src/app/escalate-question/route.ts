import type { Escalation } from "@prisma/client";
import { NextResponse } from "next/server";
import { getQueueProvider } from "@/providers/queue-provider";
import { getNotificationProvider } from "@/providers/twilio-provider";
import { EscalationService } from "@/services/escalation.service";
import { hasAuth, getAuthToken } from "@/utils/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      return new Response("Empty object", { status: 400 });
    }
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const {
    phoneNumber,
    question,
    aiResponse,
    timestamp,
    responsePreference,
    waitingForResponse,
    sessionId,
    userId,
  } = body;

  // Explicit Compatibility Parser
  const isLegacyMode = /^\d{10}$/.test(phoneNumber);
  const isAssignmentMode = /^\+\d{10,15}$/.test(phoneNumber);

  if (!isLegacyMode && !isAssignmentMode) {
    return new Response("Invalid phone number format", { status: 400 });
  }

  let finalPhoneNumber = phoneNumber;
  let finalQuestion = question;
  let finalAiResponse = aiResponse;
  let finalTimestamp = timestamp;
  let finalResponsePreference = responsePreference;
  let finalWaitingForResponse = waitingForResponse;
  let finalSessionId = sessionId;
  let finalUserId = userId;

  if (isLegacyMode) {
    // Legacy Mode Validation
    if (typeof question !== "string" || !question.trim()) return new Response("Missing question", { status: 400 });
    if (!["call", "text", "chat"].includes(responsePreference)) return new Response("Invalid responsePreference", { status: 400 });

    // Normalize and set defaults
    finalPhoneNumber = `+1${phoneNumber}`;
    finalAiResponse = "Thank you for reaching out. A mobility coach will contact you shortly.";
    finalTimestamp = new Date().toISOString();
    finalWaitingForResponse = true;
    finalSessionId = `local_session_${Date.now()}`;
    // finalUserId stays undefined/null to be resolved below
  } else {
    // Full Assignment Mode Validation
    if (
      typeof question !== "string" || !question.trim() ||
      typeof aiResponse !== "string" || !aiResponse.trim() ||
      typeof timestamp !== "string" || isNaN(Date.parse(timestamp)) ||
      !["call", "text", "chat"].includes(responsePreference) ||
      typeof waitingForResponse !== "boolean" ||
      typeof sessionId !== "string" || !sessionId.trim() ||
      typeof userId !== "string" || !userId.trim()
    ) {
      return new Response("Missing or invalid required fields for assignment mode", { status: 400 });
    }
  }

  // Input Sanitization
  const sanitize = (str: string) => {
    if (!str) return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/<!DOCTYPE[^>]*>/gi, "") // Remove DOCTYPE
      .replace(/<!ENTITY[^>]*>/gi, ""); // Remove ENTITY
  };

  const sanitizedQuestion = sanitize(finalQuestion);
  const sanitizedAiResponse = sanitize(finalAiResponse);

  // Classification logic
  const lowerQ = sanitizedQuestion.toLowerCase();
  let category: "medical" | "technical" | "general" = "general";
  if (
    lowerQ.includes("chest pain") ||
    lowerQ.includes("knee pain") ||
    lowerQ.includes("medication") ||
    lowerQ.includes("prescription") ||
    lowerQ.includes("injury") ||
    lowerQ.includes("dizziness") ||
    lowerQ.includes("fall") ||
    lowerQ.includes("worried after a balance test") ||
    lowerQ.includes("pain") ||
    lowerQ.includes("dizzy") ||
    lowerQ.includes("emergency")
  ) {
    category = "medical";
  } else if (
    lowerQ.includes("app keeps crashing") ||
    lowerQ.includes("app is not working") ||
    lowerQ.includes("login issue") ||
    lowerQ.includes("device issue") ||
    lowerQ.includes("connection issue") ||
    lowerQ.includes("cannot view balance scores") ||
    lowerQ.includes("crashing") ||
    lowerQ.includes("error") ||
    lowerQ.includes("login") ||
    lowerQ.includes("bug")
  ) {
    category = "technical";
  }

  let priority: "high" | "medium" | "low" = "low";
  if (category === "medical") {
    priority = "high";
  } else if (category === "technical") {
    priority = "low";
  }

  // Handle synthetic userId: use authenticated user if available, otherwise check if supplied userId exists
  const token = getAuthToken(request);
  let authUserId = null;
  if (token && prisma.authSession) {
    const session = await prisma.authSession.findFirst({ where: { tokenHash: token } });
    if (session) {
      authUserId = session.userId;
    }
  }

  let userIdToResolve = authUserId;
  if (!userIdToResolve && finalUserId) {
    const userExists = await prisma.user.findUnique({ where: { id: finalUserId } });
    userIdToResolve = userExists ? userExists.id : null;
  }

  // Generate ID and persist
  const escalationId = `esc_${Date.now()}${Math.random().toString(36).substring(2, 11)}`;
  const estResponseTime = priority === "high" ? "15-30 minutes" : "1-2 hours";

  const escalation: Omit<Escalation, "id" | "createdAt" | "updatedAt"> = {
    escalationId,
    userId: userIdToResolve,
    phoneNumber: finalPhoneNumber,
    originalQuestion: sanitizedQuestion,
    aiResponse: sanitizedAiResponse || "",
    questionTimestamp: new Date(finalTimestamp),
    escalationTimestamp: new Date(),
    responsePreference: finalResponsePreference.toUpperCase() as any,
    waitingForResponse: finalWaitingForResponse ?? true,
    priority: priority.toUpperCase() as any,
    category: category.toUpperCase() as any,
    status: "PENDING" as any,
    resolutionTimestamp: null,
    coachId: null,
  };

  const service = new EscalationService();
  await service.createEscalation(escalation);

  // Queue event for background processing
  try {
    const queueProvider = getQueueProvider();
    await queueProvider.sendMessage("escalations-queue", escalation);
  } catch (err) {
    console.error("Queue provider failed:", err);
    return new Response("Service temporarily unavailable, please try again", { status: 503 });
  }

  // Send acknowledgement via Twilio (mock)
  const notificationProvider = getNotificationProvider();
  if (finalResponsePreference === "text") {
    await notificationProvider.sendSMS(
      finalPhoneNumber,
      `STEDI Mobility Coach: We've received your question and will text you back within ${estResponseTime}.`,
    );
  } else if (finalResponsePreference === "call") {
    // Just a mock, we wouldn't actually call immediately to acknowledge in a real scenario unless requested
    console.log(`[MOCK] Scheduled outbound call to ${finalPhoneNumber}`);
  }

  const responseStatus = isLegacyMode ? 201 : 200;
  return NextResponse.json(
    {
      status: "escalated",
      escalationId,
      estimatedResponseTime: estResponseTime,
      message: "Your question has been forwarded to a healthcare coach",
    },
    { status: responseStatus },
  );
}
