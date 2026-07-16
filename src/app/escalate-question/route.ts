import { NextResponse } from 'next/server';
import { hasAuth } from '@/utils/auth';
import { addEscalation, Escalation } from '@/utils/escalation-store';
import { getQueueProvider } from '@/providers/queue-provider';
import { getNotificationProvider } from '@/providers/twilio-provider';

export async function POST(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
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
    userId 
  } = body;

  // Basic validation
  if (!phoneNumber || !question || !responsePreference) {
    return new Response("Missing required fields", { status: 400 });
  }

  if (!['call', 'text', 'chat'].includes(responsePreference)) {
    return new Response("Invalid responsePreference", { status: 400 });
  }

  // Classification logic (stubbed for now, eventually LangGraph could do this)
  let category: 'medical' | 'technical' | 'general' = 'general';
  if (question.toLowerCase().includes('pain') || question.toLowerCase().includes('dizzy')) {
    category = 'medical';
  } else if (question.toLowerCase().includes('error') || question.toLowerCase().includes('login')) {
    category = 'technical';
  }

  let priority: 'high' | 'medium' | 'low' = 'low';
  if (category === 'medical') {
    priority = 'high';
  }

  // Generate ID and persist
  const escalationId = `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const escalation: Escalation = {
    escalationId,
    userId: userId || 'anonymous',
    sessionId: sessionId || 'none',
    phoneNumber,
    question,
    aiResponse: aiResponse || '',
    responsePreference: responsePreference as 'call' | 'text' | 'chat',
    priority,
    category,
    status: 'escalated',
    escalationTimestamp: timestamp || new Date().toISOString(),
    estimatedResponseTime: priority === 'high' ? '15-30 minutes' : '1-2 hours'
  };

  await addEscalation(escalation);

  // Queue event for background processing (AWS SQS mock)
  const queueProvider = getQueueProvider();
  await queueProvider.sendMessage('escalations-queue', escalation);

  // Send acknowledgement via Twilio (mock)
  const notificationProvider = getNotificationProvider();
  if (responsePreference === 'text') {
    await notificationProvider.sendSMS(phoneNumber, `STEDI Mobility Coach: We've received your question and will text you back within ${escalation.estimatedResponseTime}.`);
  } else if (responsePreference === 'call') {
    // Just a mock, we wouldn't actually call immediately to acknowledge in a real scenario unless requested
    console.log(`[MOCK] Scheduled outbound call to ${phoneNumber}`);
  }

  return NextResponse.json({
    status: "escalated",
    escalationId,
    estimatedResponseTime: escalation.estimatedResponseTime,
    message: "Your question has been forwarded to a healthcare coach"
  }, { status: 201 });
}
