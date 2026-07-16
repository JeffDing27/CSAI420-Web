import { NextResponse } from 'next/server';
import { getChatSession, updateChatSession, createChatSession } from '@/utils/chat-session-store';

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { sessionId, message } = body;
  
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  let session = await getChatSession(sessionId);
  if (!session) {
    session = await createChatSession(sessionId);
  }

  if (!session.sessionActive) {
    return new Response("Session is inactive", { status: 400 });
  }

  // Very basic mock flow
  let aiResponse = "";
  let updatedFields = { ...session.collectedFields };
  let nextStep = session.nextStep;
  let sessionActive: boolean = session.sessionActive;

  if (nextStep === 'greeting') {
    aiResponse = "Hi! I'm here to help you register for STEDI. Let's start with your first name. What is your first name?";
    nextStep = 'firstName';
  } else if (nextStep === 'firstName') {
    updatedFields.firstName = message;
    aiResponse = `Thanks, ${message}. Now, what is your last name?`;
    nextStep = 'lastName';
  } else if (nextStep === 'lastName') {
    updatedFields.lastName = message;
    aiResponse = "Got it. What's your email address?";
    nextStep = 'email';
  } else if (nextStep === 'email') {
    updatedFields.email = message;
    aiResponse = "Thanks! Please provide a strong password.";
    nextStep = 'password';
  } else if (nextStep === 'password') {
    // Note: In reality we wouldn't store plaintext passwords in standard logs
    updatedFields.password = message; 
    aiResponse = "Great. What is your phone number?";
    nextStep = 'phone';
  } else if (nextStep === 'phone') {
    updatedFields.phone = message;
    aiResponse = "Lastly, what is your birth date? (YYYY-MM-DD)";
    nextStep = 'birthDate';
  } else if (nextStep === 'birthDate') {
    updatedFields.birthDate = message;
    aiResponse = "Thank you! I have all the information. Would you like me to submit your registration now?";
    nextStep = 'confirm';
  } else if (nextStep === 'confirm') {
    if (message.toLowerCase().includes('yes')) {
      aiResponse = "Registration submitted successfully! You can now log in.";
      sessionActive = false;
    } else {
      aiResponse = "Okay, let me know if you want to correct any information.";
    }
  }

  const context = [...session.conversationContext, `User: ${message}`, `AI: ${aiResponse}`];

  await updateChatSession(sessionId, {
    nextStep,
    collectedFields: updatedFields,
    conversationContext: context,
    sessionActive
  });

  return NextResponse.json({
    aiResponse,
    nextStep,
    sessionActive,
    collectedFields: updatedFields // For UI to preview what has been gathered
  }, { status: 200 });
}
