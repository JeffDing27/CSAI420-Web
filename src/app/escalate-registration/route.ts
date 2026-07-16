import { NextResponse } from "next/server";
import { getQueueProvider } from "@/providers/queue-provider";
import { EscalationService } from "@/services/escalation.service";
import type { Escalation } from "@prisma/client";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { sessionId, phoneNumber, reason, chatContext } = body;

  if (!sessionId || !reason) {
    return new Response("Missing required fields", { status: 400 });
  }

  const validReasons = [
    "confusion_about_process",
    "technical_difficulties",
    "account_creation_failed",
  ];
  if (!validReasons.includes(reason)) {
    return new Response("Invalid reason", { status: 400 });
  }

  const escalationId = `esc_reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const escalation: Omit<Escalation, "id" | "createdAt" | "updatedAt"> = {
    escalationId,
    userId: "anonymous",
    phoneNumber: phoneNumber || "unknown",
    originalQuestion: `Registration Escalation: ${reason}`,
    aiResponse: chatContext || "None",
    questionTimestamp: new Date(),
    waitingForResponse: true,
    responsePreference: "CHAT" as any,
    priority: "HIGH" as any,
    category: "TECHNICAL" as any,
    status: "PENDING" as any,
    escalationTimestamp: new Date(),
    resolutionTimestamp: null,
    coachId: null,
  };

  const service = new EscalationService();
  await service.createEscalation(escalation);
  const queueProvider = getQueueProvider();
  await queueProvider.sendMessage("escalations-queue", escalation);

  return NextResponse.json(
    {
      status: "escalated",
      escalationId,
      message: "A human agent will assist you shortly with your registration.",
    },
    { status: 201 },
  );
}
