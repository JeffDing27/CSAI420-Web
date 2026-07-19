import { AIMessage } from "@langchain/core/messages";
import { ChatRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mobility-chat/route";
import { AuthService } from "@/lib/service/auth.service";
import { ChatMessageService } from "@/services/chat-message.service";
import { ChatSessionService } from "@/services/chat-session.service";
import { getAuthToken } from "@/utils/auth";
import { stediAgentApp } from "@/utils/langgraph-agent";

vi.mock("@/lib/service/auth.service", () => ({
  AuthService: {
    validateSession: vi.fn(),
  },
}));

vi.mock("@/utils/langgraph-agent", () => ({
  stediAgentApp: {
    invoke: vi.fn(),
  },
}));

describe("Mobility Chat API", () => {
  let mockGetSession: any;
  let mockUpsertSession: any;
  let mockGetMessages: any;
  let mockAddMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_ENABLED = "false";

    mockGetSession = vi
      .spyOn(ChatSessionService.prototype, "getSession")
      .mockImplementation(vi.fn());
    mockUpsertSession = vi
      .spyOn(ChatSessionService.prototype, "upsertSession")
      .mockImplementation(vi.fn());

    mockGetMessages = vi
      .spyOn(ChatMessageService.prototype, "getMessages")
      .mockImplementation(vi.fn().mockResolvedValue([]));
    mockAddMessage = vi
      .spyOn(ChatMessageService.prototype, "addMessage")
      .mockImplementation(vi.fn());
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new Request("http://localhost/api/mobility-chat", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        ...headers,
      }),
      body: body ? JSON.stringify(body) : null,
    });
  };

  it("returns 401 for missing authentication", async () => {
    const req = createRequest({ message: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid authentication", async () => {
    (AuthService.validateSession as any).mockResolvedValue(null);
    const req = createRequest(
      { message: "Hello" },
      { "x-suresteps-session-token": "bad-token" },
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("normalizes Bearer token correctly", async () => {
    // Tests that getAuthToken correctly slices Bearer
    const req = createRequest({}, { authorization: "Bearer my-token" });
    const token = getAuthToken(req);
    expect(token).toBe("my-token");
  });

  it("returns 400 for invalid JSON", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    const req = new Request("http://localhost/api/mobility-chat", {
      method: "POST",
      headers: new Headers({ "x-suresteps-session-token": "valid" }),
      body: "invalid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing or empty message", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    let req = createRequest(
      { message: "" },
      { "x-suresteps-session-token": "valid" },
    );
    let res = await POST(req);
    expect(res.status).toBe(400);

    req = createRequest({}, { "x-suresteps-session-token": "valid" });
    res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for message exceeding 1500 characters", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    const req = createRequest(
      { message: "A".repeat(1501) },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects an inactive or expired session", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      sessionActive: false,
      expiresAt: new Date(Date.now() + 100000),
    });
    const req = createRequest(
      { message: "Hello", sessionId: "inactive" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects an expired session", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      sessionActive: true,
      expiresAt: new Date(Date.now() - 100000),
    });
    const req = createRequest(
      { message: "Hello", sessionId: "expired" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("enforces session ownership", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockGetSession.mockResolvedValue({
      userId: "another-user",
      sessionActive: true,
      expiresAt: new Date(Date.now() + 100000),
    });
    const req = createRequest(
      { message: "Hello", sessionId: "other-user-session" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("creates a new chat session owned by the authenticated user if sessionId is absent", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockUpsertSession.mockResolvedValue({
      id: "new-session",
      userId: "user-123",
    });
    (stediAgentApp.invoke as any).mockResolvedValue({
      messages: [new AIMessage("Hello back!")],
    });

    const req = createRequest(
      { message: "Hello" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(mockUpsertSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-123" }),
    );
    expect(data.safetyLevel).toBe("normal");
  });

  it("handles caution safety classification and skips AI", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockUpsertSession.mockResolvedValue({
      id: "new-session",
      userId: "user-123",
    });

    const req = createRequest(
      { message: "I feel dizzy" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.safetyLevel).toBe("caution");
    expect(stediAgentApp.invoke).not.toHaveBeenCalled();
    expect(data.message).toContain("stop the exercise immediately");

    // Check persistence of user and assistant message
    expect(mockAddMessage).toHaveBeenCalledTimes(2);
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: ChatRole.USER, message: "I feel dizzy" }),
    );
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        role: ChatRole.ASSISTANT,
        message: expect.stringContaining("stop the exercise immediately"),
      }),
    );
  });

  it("handles urgent safety classification and skips AI", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockUpsertSession.mockResolvedValue({
      id: "new-session",
      userId: "user-123",
    });

    const req = createRequest(
      { message: "I have chest pain" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.safetyLevel).toBe("urgent");
    expect(stediAgentApp.invoke).not.toHaveBeenCalled();
    expect(data.message).toContain("contact emergency services");
  });

  it("supplies bounded history to model context", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      sessionActive: true,
      expiresAt: new Date(Date.now() + 100000),
    });

    const mockMessages = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? ChatRole.USER : ChatRole.ASSISTANT,
      message: `msg ${i}`,
    }));
    mockGetMessages.mockResolvedValue(mockMessages);

    (stediAgentApp.invoke as any).mockResolvedValue({
      messages: [new AIMessage("AI Reply")],
    });

    const req = createRequest(
      { message: "New question", sessionId: "existing-session" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(stediAgentApp.invoke).toHaveBeenCalled();
    const invokeArgs = (stediAgentApp.invoke as any).mock.calls[0][0];

    // Should be bounded to 20 messages
    expect(invokeArgs.messages.length).toBe(20);
    // Ensure mock RAG is not being used as real retrieval in testing context
    expect(invokeArgs.context).toBe("");
  });

  it("safely handles AI provider failure without leaking stack trace", async () => {
    (AuthService.validateSession as any).mockResolvedValue({
      userId: "user-123",
    });
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      sessionActive: true,
      expiresAt: new Date(Date.now() + 100000),
    });

    (stediAgentApp.invoke as any).mockRejectedValue(
      new Error("API Key expired or down"),
    );

    const req = createRequest(
      { message: "Hello", sessionId: "existing-session" },
      { "x-suresteps-session-token": "valid" },
    );
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal Server Error");
    expect(data.stack).toBeUndefined();
  });
});
