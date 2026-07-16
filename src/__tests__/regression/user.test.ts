import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/user/route";
import * as kvStore from "@/utils/kv-store";
import * as passThrough from "@/utils/pass-through";

vi.mock("@/utils/kv-store", () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
}));

vi.mock("@/utils/pass-through", () => ({
  forwardRequest: vi.fn(),
}));

function createRequest(body: any, method = "POST") {
  return new Request("http://localhost:3000/user", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /user", () => {
  const validPayload = {
    userName: "TestUser",
    email: "test@example.com",
    password: "StrongPassword123!",
    verifyPassword: "StrongPassword123!",
    birthDate: "1990-01-01",
    phone: "1234567890",
    region: "US",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USE_LOCAL_USER_STORE = "false";
  });

  it("validates input - missing email returns 400", async () => {
    const payload = { ...validPayload, email: "" };
    const res = await POST(createRequest(payload));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("validates input - weak password returns 400", async () => {
    const payload = {
      ...validPayload,
      password: "short",
      verifyPassword: "short",
    };
    const res = await POST(createRequest(payload));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/password must be at least 8/i);
  });

  it("validates input - password mismatch returns 400", async () => {
    const payload = {
      ...validPayload,
      verifyPassword: "DifferentPassword123!",
    };
    const res = await POST(createRequest(payload));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/passwords do not match/i);
  });

  it("STEDI forwarding - valid account creation returns STEDI response", async () => {
    (passThrough.forwardRequest as any).mockResolvedValueOnce(
      new Response("User created", { status: 200 }),
    );

    const res = await POST(createRequest(validPayload));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("User created");
    expect(passThrough.forwardRequest).toHaveBeenCalled();
  });

  it("STEDI forwarding - external service failure returns 502", async () => {
    (passThrough.forwardRequest as any).mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );

    const res = await POST(createRequest(validPayload));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toMatch(/upstream service unavailable/i);
  });

  it("Local Fallback Mode - valid account creation", async () => {
    process.env.USE_LOCAL_USER_STORE = "true";
    (kvStore.kvGet as any).mockResolvedValueOnce(null);

    const res = await POST(createRequest(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("User created successfully");

    // Verify it was saved correctly
    expect(kvStore.kvSet).toHaveBeenCalledWith(
      "user:test@example.com",
      expect.objectContaining({
        email: "test@example.com",
        userName: "TestUser",
      }),
    );

    const setArg = (kvStore.kvSet as any).mock.calls[0][1];
    expect(setArg.password).toBeUndefined(); // Should not store plaintext password
    expect(setArg.verifyPassword).toBeUndefined(); // Should not store verifyPassword
    expect(setArg.passwordHash).toBeDefined();
    expect(setArg.passwordSalt).toBeDefined();
  });

  it("Local Fallback Mode - duplicate user returns 409", async () => {
    process.env.USE_LOCAL_USER_STORE = "true";
    (kvStore.kvGet as any).mockResolvedValueOnce({ email: "test@example.com" });

    const res = await POST(createRequest(validPayload));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/user already exists/i);
  });
});
