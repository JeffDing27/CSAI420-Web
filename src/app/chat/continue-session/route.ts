import { NextResponse } from "next/server";
import { ChatSessionService } from "@/services/chat-session.service";

const service = new ChatSessionService();

function normalizeContext(ctx: any[]): { role: string; message: string }[] {
  if (!Array.isArray(ctx)) return [];
  return ctx.map((item) => {
    if (typeof item === "string") {
      if (item.startsWith("User: ")) {
        return { role: "user", message: item.replace("User: ", "") };
      }
      if (item.startsWith("AI: ")) {
        return { role: "assistant", message: item.replace("AI: ", "") };
      }
      return { role: "user", message: item };
    }
    return item;
  });
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ errors: ["Invalid JSON body"] }, { status: 400 });
  }

  const chatSessionId = body.chatSessionId || body.sessionId;
  const message = body.message;
  const requestContext = body.context;

  if (!chatSessionId || typeof chatSessionId !== "string") {
    return NextResponse.json(
      { errors: ["Missing required field: chatSessionId"] },
      { status: 400 },
    );
  }

  if (typeof message !== "string") {
    return NextResponse.json(
      { errors: ["Missing or invalid message"] },
      { status: 400 },
    );
  }

  let session = await service.getSession(chatSessionId);
  if (!session) {
    session = await service.createSession(chatSessionId);
  }

  if (!session.sessionActive) {
    return NextResponse.json(
      { errors: ["Session is inactive"] },
      { status: 400 },
    );
  }

  const contextData = session.context as {
    collectedFields?: Record<string, string>;
    conversationContext?: any[];
  };

  let aiResponse = "";
  const updatedFields = { ...(contextData.collectedFields || {}) };

  // Use requestContext if it's one of the known classroom steps, otherwise session.nextStep
  let nextStep = session.nextStep;
  if (requestContext === "initial_greeting" || requestContext === "greeting") {
    nextStep = "initial_greeting";
  } else if (requestContext === "name_provided") {
    nextStep = "name_provided";
  } else if (requestContext === "email_provided") {
    nextStep = "email_provided";
  }

  let sessionActive: boolean = session.sessionActive;

  if (nextStep === "initial_greeting" || nextStep === "greeting") {
    aiResponse = "Hi! I'm here to help you register. What is your name?";
    nextStep = "name_collection";
  } else if (nextStep === "name_collection" || nextStep === "name_provided") {
    updatedFields.name = message; // assuming name provided
    aiResponse = "Thanks! Now, what is your email address?";
    nextStep = "email_collection";
  } else if (nextStep === "email_collection" || nextStep === "email_provided") {
    updatedFields.email = message;
    aiResponse = "Got it. What's your birth date? (YYYY-MM-DD)";
    nextStep = "birth_date_collection";
  } else if (nextStep === "birth_date_collection") {
    updatedFields.birthDate = message;
    aiResponse = "Great. Please provide a strong password.";
    nextStep = "password_collection";
  } else if (nextStep === "password_collection") {
    updatedFields.password = message;
    aiResponse = "What is your phone number?";
    nextStep = "phone_collection";
  } else if (nextStep === "phone_collection") {
    updatedFields.phone = message;
    aiResponse = "Thank you! I have all the information. Would you like me to submit your registration now?";
    nextStep = "confirm";
  } else if (nextStep === "confirm") {
    if (message.toLowerCase().includes("yes")) {
      aiResponse = "Registration submitted successfully! You can now log in.";
      sessionActive = false;
    } else {
      aiResponse = "Okay, let me know if you want to correct any information.";
    }
  }

  const existingConversation = normalizeContext(
    contextData.conversationContext || [],
  );

  const newContext = [
    ...existingConversation,
    { role: "user", message },
    { role: "assistant", message: aiResponse },
  ];

  await service.upsertSession({
    ...session,
    nextStep,
    sessionActive,
    context: {
      collectedFields: updatedFields,
      conversationContext: newContext,
    },
  });

  return NextResponse.json(
    {
      response: aiResponse,
      aiResponse, // backward compatibility
      conversationContext: newContext,
      nextStep,
      sessionActive,
    },
    { status: 200 },
  );
}
