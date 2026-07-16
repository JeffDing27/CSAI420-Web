import { it, describe, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/login/route";
import * as kvStore from "@/utils/kv-store";
import * as passThrough from "@/utils/pass-through";
import crypto from "crypto";

vi.mock("@/utils/kv-store", () => ({
  kvGet: vi.fn(),
}));

vi.mock("@/utils/pass-through", () => ({
  forwardRequest: vi.fn(),
}));

function createRequest(body: any) {
  return new Request("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /login", () => {
  const validPayload = {
    userName: "TestUser@example.com",
    password: "StrongPassword123!",
  };

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(validPayload.password, salt, 1000, 64, "sha512").toString("hex");

  const mockUserRecord = {
    email: "testuser@example.com",
    userName: "TestUser",
    passwordHash,
    passwordSalt: salt,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USE_LOCAL_USER_STORE = "false";
  });

  it("STEDI forwarding - external login when local mode is disabled", async () => {
    (passThrough.forwardRequest as any).mockResolvedValueOnce(
      new Response("mocked-stedi-token", { status: 200 })
    );

    const res = await POST(createRequest(validPayload));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("mocked-stedi-token");
    expect(passThrough.forwardRequest).toHaveBeenCalled();
  });

  it("Local Fallback Mode - successful local login", async () => {
    process.env.USE_LOCAL_USER_STORE = "true";
    (kvStore.kvGet as any).mockResolvedValueOnce(mockUserRecord);

    const res = await POST(createRequest(validPayload));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(10); // Check that a token was generated
    expect(kvStore.kvGet).toHaveBeenCalledWith("user:testuser@example.com");
  });

  it("Local Fallback Mode - normalized uppercase email", async () => {
    process.env.USE_LOCAL_USER_STORE = "true";
    (kvStore.kvGet as any).mockResolvedValueOnce(mockUserRecord);

    // Provide email with spaces and uppercase
    const payload = { ...validPayload, userName: "  TestUser@EXAMPLE.com  " };
    const res = await POST(createRequest(payload));
    
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(10);
    expect(kvStore.kvGet).toHaveBeenCalledWith("user:testuser@example.com");
  });

  it("Local Fallback Mode - unknown user returns 401", async () => {
    process.env.USE_LOCAL_USER_STORE = "true";
    (kvStore.kvGet as any).mockResolvedValueOnce(null);

    const res = await POST(createRequest(validPayload));
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toMatch(/invalid credentials/i);
  });

  it("Local Fallback Mode - incorrect password returns 401", async () => {
    process.env.USE_LOCAL_USER_STORE = "true";
    (kvStore.kvGet as any).mockResolvedValueOnce(mockUserRecord);

    const payload = { ...validPayload, password: "WrongPassword!" };
    const res = await POST(createRequest(payload));
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toMatch(/invalid credentials/i);
  });
});
