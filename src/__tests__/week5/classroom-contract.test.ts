import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as chatAssistedPost } from "@/app/user/chat-assisted/route";
import { POST as escalatePost } from "@/app/escalate-registration/route";
import { POST as continueSessionPost } from "@/app/chat/continue-session/route";
import { AuthService } from "@/lib/service/auth.service";
import { UserRepository } from "@/lib/repository/user.repository";
import { ChatSessionService } from "@/services/chat-session.service";
import { EscalationService } from "@/services/escalation.service";
import * as queueProvider from "@/providers/queue-provider";

vi.mock("@/lib/service/auth.service", () => ({
  AuthService: {
    signup: vi.fn(),
    normalizeEmail: vi.fn((e) => e.trim().toLowerCase()),
  },
}));

vi.mock("@/lib/repository/user.repository", () => ({
  UserRepository: {
    findByEmail: vi.fn(),
  },
}));

const { mockGetSession, mockCreateSession, mockUpsertSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCreateSession: vi.fn(),
  mockUpsertSession: vi.fn(),
}));

const { mockCreateEscalation } = vi.hoisted(() => ({
  mockCreateEscalation: vi.fn(),
}));

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

vi.mock("@/services/chat-session.service", () => {
  return {
    ChatSessionService: class {
      getSession = mockGetSession;
      createSession = mockCreateSession;
      upsertSession = mockUpsertSession;
    }
  };
});

vi.mock("@/services/escalation.service", () => {
  return {
    EscalationService: class {
      createEscalation = mockCreateEscalation;
    }
  };
});

vi.mock("@/providers/queue-provider", () => {
  return {
    getQueueProvider: vi.fn(() => ({
      sendMessage: mockSendMessage
    })),
    MockQueueProvider: class {
      sendMessage = mockSendMessage;
    }
  };
});

describe("Classroom Contract - Week 5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /user/chat-assisted", () => {
    it("handles nested userData success", async () => {
      vi.mocked(UserRepository.findByEmail).mockResolvedValueOnce(null);
      vi.mocked(AuthService.signup).mockResolvedValueOnce({
        user: {
          id: "123",
          email: "chat_123@example.com",
          firstName: "ChatBot",
          lastName: "TestUser",
          createdAt: new Date("2023-01-01T00:00:00Z"),
        } as any,
      });
      // Mock session not expired
      mockGetSession.mockResolvedValueOnce({
        updatedAt: new Date(Date.now()),
      } as any);

      const request = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: JSON.stringify({
          userData: {
            email: "chat_123@example.com",
            password: "SecurePassword123!",
            birthDate: "1990-01-01",
            phone: "+1234567890",
            firstName: "ChatBot",
            lastName: "TestUser",
          },
          chatSessionId: "session_123",
        }),
      });

      const response = await chatAssistedPost(request);
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.user.email).toBe("chat_123@example.com");
      expect(data.message).toContain("chat assistant");
    });

    it("makes repeated registration idempotent for any email", async () => {
      vi.mocked(UserRepository.findByEmail).mockResolvedValueOnce({
        id: "abc",
        email: "already@example.com",
        firstName: "Already",
        lastName: "Exists",
        createdAt: new Date("2023-01-01T00:00:00Z"),
      } as any);

      const request = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: JSON.stringify({
          userData: {
            email: "already@example.com",
            password: "SecurePassword123!",
            birthDate: "1990-01-01",
            phone: "+1234567890",
            firstName: "Already",
            lastName: "Exists",
          },
          chatSessionId: "session_123",
        }),
      });

      const response = await chatAssistedPost(request);
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.user.id).toBe("abc");
      expect(AuthService.signup).not.toHaveBeenCalled();
    });

    it("generates different synthetic phones for concurrent users when phone is missing", async () => {
      vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(AuthService.signup).mockResolvedValue({
        user: { id: "1", email: "test@example.com", createdAt: new Date() } as any,
      });

      const req1 = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: JSON.stringify({
          userData: {
            email: "user1@example.com",
            password: "SecurePassword123!",
            birthDate: "1990-01-01",
            firstName: "User",
            lastName: "One",
          },
          chatSessionId: "session_1",
        }),
      });

      const req2 = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: JSON.stringify({
          userData: {
            email: "user2@example.com",
            password: "SecurePassword123!",
            birthDate: "1990-01-01",
            firstName: "User",
            lastName: "Two",
          },
          chatSessionId: "session_2",
        }),
      });

      await chatAssistedPost(req1);
      await chatAssistedPost(req2);

      const call1 = vi.mocked(AuthService.signup).mock.calls[0][0];
      const call2 = vi.mocked(AuthService.signup).mock.calls[1][0];

      expect(call1.phone).toBeDefined();
      expect(call2.phone).toBeDefined();
      expect(call1.phone).not.toBe(call2.phone);
    });

    it("rejects invalid inputs", async () => {
      const request = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: JSON.stringify({
          userData: {
            email: "bad email@example.com", // spaces
            password: "weak", // weak
            birthDate: "not-a-date", // invalid date
            firstName: "", // missing
            lastName: "<script>alert('xss')</script>", // malicious
          },
          chatSessionId: "session_123",
        }),
      });

      const response = await chatAssistedPost(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.errors.length).toBeGreaterThan(0);
      expect(data.requiresChat).toBe(true);
    });

    it("accepts valid unicode names", async () => {
      vi.mocked(UserRepository.findByEmail).mockResolvedValueOnce(null);
      vi.mocked(AuthService.signup).mockResolvedValueOnce({
        user: { id: "1", email: "test@example.com", createdAt: new Date() } as any,
      });

      const request = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: JSON.stringify({
          userData: {
            email: "unicode@example.com",
            password: "SecurePassword123!",
            birthDate: "1990-01-01",
            firstName: "José María",
            lastName: "García-López",
          },
          chatSessionId: "session_123",
        }),
      });

      const response = await chatAssistedPost(request);
      expect(response.status).toBe(201);
      const call = vi.mocked(AuthService.signup).mock.calls[0][0];
      expect(call.firstName).toBe("José María");
      expect(call.lastName).toBe("García-López");
    });

    it("returns 408 for expired session", async () => {
      mockGetSession.mockResolvedValueOnce({
        updatedAt: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes old
      } as any);

      const request = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: JSON.stringify({
          userData: {
            email: "chat_123@example.com",
            password: "SecurePassword123!",
            birthDate: "1990-01-01",
            firstName: "ChatBot",
            lastName: "TestUser",
          },
          chatSessionId: "session_123",
        }),
      });

      const response = await chatAssistedPost(request);
      expect(response.status).toBe(408);
      const data = await response.json();
      expect(data.message).toContain("session");
    });

    it("handles malformed JSON", async () => {
      const request = new Request("http://localhost/user/chat-assisted", {
        method: "POST",
        body: "bad json",
      });
      const response = await chatAssistedPost(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.errors).toBeDefined();
    });
  });

  describe("POST /escalate-registration", () => {
    it("handles valid requests and returns exact 200 response", async () => {
      const mockQueue = { sendMessage: vi.fn() };
      vi.mocked(queueProvider.getQueueProvider).mockReturnValue(mockQueue as any);

      const request = new Request("http://localhost/escalate-registration", {
        method: "POST",
        body: JSON.stringify({
          phoneNumber: "8014567890",
          registrationData: {},
          chatSessionId: "session_123",
          issueType: "technical_difficulties",
          aiResponse: "I cannot proceed",
          responsePreference: "chat",
          conversationContext: [],
        }),
      });

      const response = await escalatePost(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.status).toBe("escalated");
      expect(data.escalationId).toMatch(/^esc_reg_/);
      expect(data.estimatedResponseTime).toBe("15-30 minutes");
      expect(data.message).toContain("support team");
    });

    it("rejects invalid phone and missing issue type", async () => {
      const request = new Request("http://localhost/escalate-registration", {
        method: "POST",
        body: JSON.stringify({
          phoneNumber: "123",
          chatSessionId: "session_123",
          issueType: "invalid_issue",
        }),
      });
      const response = await escalatePost(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.errors).toBeDefined();
    });
  });

  describe("POST /chat/continue-session", () => {
    it("accumulates structured chat context across two calls", async () => {
      let sessionState: any = {
        sessionActive: true,
        nextStep: "initial_greeting",
        context: { conversationContext: [] }
      };

      mockGetSession.mockImplementation(() => Promise.resolve(sessionState));
      mockCreateSession.mockImplementation(() => Promise.resolve(sessionState));
      mockUpsertSession.mockImplementation(async (s: any) => {
        sessionState = s;
        return s;
      });

      // Call 1
      const req1 = new Request("http://localhost/chat/continue-session", {
        method: "POST",
        body: JSON.stringify({
          chatSessionId: "sess1",
          message: "I need help signing up",
          context: "initial_greeting"
        }),
      });

      const res1 = await continueSessionPost(req1);
      const data1 = await res1.json();
      expect(data1.nextStep).toBe("name_collection");
      expect(data1.conversationContext.length).toBe(2);

      // Call 2
      const req2 = new Request("http://localhost/chat/continue-session", {
        method: "POST",
        body: JSON.stringify({
          chatSessionId: "sess1",
          message: "My name is John",
          context: "name_provided"
        }),
      });

      const res2 = await continueSessionPost(req2);
      const data2 = await res2.json();
      expect(data2.nextStep).toBe("email_collection");
      expect(data2.conversationContext.length).toBe(4); // 2 from previous, 2 new
      expect(data2.conversationContext[0].role).toBe("user");
      expect(data2.conversationContext[0].message).toBe("I need help signing up");
      expect(data2.conversationContext[2].role).toBe("user");
      expect(data2.conversationContext[2].message).toBe("My name is John");
    });
  });
});
