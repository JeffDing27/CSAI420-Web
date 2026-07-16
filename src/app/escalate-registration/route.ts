import { NextResponse } from 'next/server';
import { addEscalation, Escalation } from '@/utils/escalation-store';
import { getQueueProvider } from '@/providers/queue-provider';

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

  const validReasons = ['confusion_about_process', 'technical_difficulties', 'account_creation_failed'];
  if (!validReasons.includes(reason)) {
    return new Response("Invalid reason", { status: 400 });
  }

  const escalationId = `esc_reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const escalation: Escalation = {
    escalationId,
    userId: 'anonymous',
    sessionId,
    phoneNumber: phoneNumber || 'unknown',
    question: `Registration Escalation: ${reason}`,
    aiResponse: chatContext || 'None',
    responsePreference: 'chat',
    priority: 'high',
    category: 'technical',
    status: 'escalated',
    escalationTimestamp: new Date().toISOString(),
    estimatedResponseTime: '15-30 minutes'
  };

  await addEscalation(escalation);
  const queueProvider = getQueueProvider();
  await queueProvider.sendMessage('escalations-queue', escalation);

  return NextResponse.json({
    status: "escalated",
    escalationId,
    message: "A human agent will assist you shortly with your registration."
  }, { status: 201 });
}
