import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/escalate-question/route";
import { getEscalation } from "@/utils/escalation-store";
import { resetKvFallback } from "@/utils/kv-store";

describe("Week 4: Escalate Question", () => {
  const mockToken = "test-token";

  afterEach(() => {
    resetKvFallback();
  });

  const createRequest = (method: string, body?: any, token?: string) => {
    const headers = new Headers();
    if (token) headers.set("suresteps.session.token", token);

    return new Request(`http://localhost/api/test`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it("requires authentication", async () => {
    const req = createRequest("POST", {
      phoneNumber: "1234567890",
      question: "help",
      responsePreference: "text",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("validates required fields", async () => {
    const req = createRequest(
      "POST",
      {
        question: "help",
      },
      mockToken,
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates a medical escalation with high priority", async () => {
    const req = createRequest(
      "POST",
      {
        phoneNumber: "1234567890",
        question: "I feel dizzy after the test",
        responsePreference: "call",
      },
      mockToken,
    );

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.status).toBe("escalated");
    expect(data.escalationId).toBeDefined();

    // Verify persistence
    const saved = await getEscalation(data.escalationId);
    expect(saved).not.toBeNull();
    expect(saved?.priority).toBe("high");
    expect(saved?.category).toBe("medical");
  });

  it("creates a technical escalation", async () => {
    const req = createRequest(
      "POST",
      {
        phoneNumber: "1234567890",
        question: "I got a login error",
        responsePreference: "text",
      },
      mockToken,
    );

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    const saved = await getEscalation(data.escalationId);
    expect(saved?.priority).toBe("low");
    expect(saved?.category).toBe("technical");
  });
});
