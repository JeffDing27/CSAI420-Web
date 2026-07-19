import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatRole } from "@prisma/client";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { AuthService } from "@/lib/service/auth.service";
import { ChatMessageService } from "@/services/chat-message.service";
import { ChatSessionService } from "@/services/chat-session.service";
import { getAuthToken } from "@/utils/auth";
import { stediAgentApp } from "@/utils/langgraph-agent";
import { classifySafety } from "@/utils/safety-classifier";

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authSession = await AuthService.validateSession(token);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authSession.userId;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    let { message, sessionId } = body;

    if (typeof message !== "string") {
      return NextResponse.json(
        { error: "Message must be a string" },
        { status: 400 },
      );
    }

    message = message.trim();
    if (!message) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 },
      );
    }

    if (message.length > 1500) {
      return NextResponse.json(
        { error: "Message exceeds 1500 characters" },
        { status: 400 },
      );
    }

    const chatSessionService = new ChatSessionService();
    const chatMessageService = new ChatMessageService();

    let session;
    if (sessionId) {
      session = await chatSessionService.getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }
      if (session.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!session.sessionActive || session.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Session inactive or expired" },
          { status: 400 },
        );
      }
    } else {
      sessionId = crypto.randomUUID();
      session = await chatSessionService.upsertSession({
        id: sessionId,
        userId: userId,
        threadId: null,
        context: { collectedFields: {}, conversationContext: [] },
        nextStep: "greeting",
        sessionActive: true,
        accessibilityMode: false,
        locale: "en",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    const classification = classifySafety(message);

    // Save User message
    await chatMessageService.addMessage({
      id: crypto.randomUUID(),
      chatSessionId: sessionId,
      role: ChatRole.USER,
      message: message,
      metadata: {},
    });

    let assistantResponse = "";

    if (
      classification.level === "urgent" ||
      classification.level === "caution"
    ) {
      assistantResponse = classification.response as string;
    } else {
      // Normal flow - invoke LangGraph
      const pastMessagesDb = await chatMessageService.getMessages(sessionId);

      // Limit to last 20 messages for context window bounds
      const boundedMessagesDb = pastMessagesDb.slice(-20);

      const langChainMessages = boundedMessagesDb.map((m) => {
        if (m.role === ChatRole.ASSISTANT) {
          return new AIMessage(m.message);
        } else if (m.role === ChatRole.SYSTEM) {
          return new SystemMessage(m.message);
        } else {
          return new HumanMessage(m.message);
        }
      });

      try {
        const aiResult = await stediAgentApp.invoke({
          messages: langChainMessages,
          context: "",
          sessionId,
        });

        const lastMsg = aiResult.messages[aiResult.messages.length - 1];
        assistantResponse = lastMsg.content;
      } catch (err) {
        console.error("AI invocation failed", err);
        return NextResponse.json(
          { error: "Internal Server Error" },
          { status: 500 },
        );
      }
    }

    // Save Assistant message
    await chatMessageService.addMessage({
      id: crypto.randomUUID(),
      chatSessionId: sessionId,
      role: ChatRole.ASSISTANT,
      message: assistantResponse,
      metadata: {},
    });

    return NextResponse.json(
      {
        sessionId,
        message: assistantResponse,
        safetyLevel: classification.level,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mobility chat error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
