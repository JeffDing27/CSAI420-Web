import { prisma } from "@/utils/prisma";
import { getSessionToken } from "@/utils/pass-through";

type EscalationRequestBody = {
  phoneNumber?: string;
  question?: string;
  aiResponse?: string;
  responsePreference?: string;
  waitingForResponse?: boolean;
  sessionId?: string;
  userId?: string;
  timestamp?: string;
};

const allowedResponsePreferences = ["call", "chat", "text"];

function sanitizeInput(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!ENTITY[^>]*>/gi, "")
    .replace(/<\?xml[^>]*\?>/gi, "")
    .trim();
}

function isValidPhoneNumber(phoneNumber: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phoneNumber);
}

function classifyEscalation(question: string): {
  category: string;
  priority: string;
  estimatedResponseTime: string;
} {
  const normalizedQuestion = question.toLowerCase();

  const medicalKeywords = [
    "chest pain",
    "difficulty breathing",
    "shortness of breath",
    "heart attack",
    "stroke",
    "emergency",
    "severe pain",
    "unconscious",
  ];

  const technicalKeywords = [
    "app",
    "crash",
    "crashing",
    "bug",
    "error",
    "login",
    "screen",
    "technical",
    "not working",
  ];

  if (medicalKeywords.some((keyword) => normalizedQuestion.includes(keyword))) {
    return {
      category: "medical",
      priority: "high",
      estimatedResponseTime: "Within 5 minutes",
    };
  }

  if (
    technicalKeywords.some((keyword) => normalizedQuestion.includes(keyword))
  ) {
    return {
      category: "technical",
      priority: "medium",
      estimatedResponseTime: "Within 30 minutes",
    };
  }

  return {
    category: "general",
    priority: "low",
    estimatedResponseTime: "Within 24 hours",
  };
}

function createEscalationId(): string {
  return `esc_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function POST(request: Request) {
  try {
    if (!getSessionToken(request)) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    let body: EscalationRequestBody;

    try {
      body = (await request.json()) as EscalationRequestBody;
    } catch {
      return new Response("Invalid JSON request body", {
        status: 400,
      });
    }

    const phoneNumber = body.phoneNumber?.trim();
    const question = body.question?.trim();
    const aiResponse = body.aiResponse?.trim();
    const responsePreference = body.responsePreference?.trim().toLowerCase();

    if (!phoneNumber || !question || !aiResponse || !responsePreference) {
      return new Response(
        "phoneNumber, question, aiResponse, and responsePreference are required",
        {
          status: 400,
        },
      );
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return new Response("Invalid phone number format", {
        status: 400,
      });
    }

    if (!allowedResponsePreferences.includes(responsePreference)) {
      return new Response("responsePreference must be call, chat, or text", {
        status: 400,
      });
    }

    const sanitizedQuestion = sanitizeInput(question);
    const sanitizedAiResponse = sanitizeInput(aiResponse);

    const classification = classifyEscalation(sanitizedQuestion);
    const escalationId = createEscalationId();

    let escalationTimestamp = new Date();

    if (body.timestamp) {
      const suppliedTimestamp = new Date(body.timestamp);

      if (!Number.isNaN(suppliedTimestamp.getTime())) {
        escalationTimestamp = suppliedTimestamp;
      }
    }

    await prisma.escalation.create({
      data: {
        id: escalationId,
        phoneNumber,
        originalQuestion: sanitizedQuestion,
        aiResponse: sanitizedAiResponse,
        responsePreference,
        waitingForResponse: body.waitingForResponse ?? false,
        sessionId: body.sessionId?.trim() || null,
        userId: body.userId?.trim() || null,
        status: "pending",
        priority: classification.priority,
        category: classification.category,
        escalationTimestamp,
      },
    });

    return Response.json(
      {
        status: "escalated",
        escalationId,
        estimatedResponseTime: classification.estimatedResponseTime,
        message:
          "Your question has been forwarded to a healthcare coach for review.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Failed to create escalation:", error);

    return new Response("Service temporarily unavailable. Please try again.", {
      status: 500,
    });
  }
}
