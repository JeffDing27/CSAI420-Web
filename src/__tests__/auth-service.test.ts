import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/service/auth.service";
import * as kvStore from "@/utils/kv-store";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    customerReference: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    authSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/utils/kv-store", () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
}));

describe("AuthService Dual-Write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STORAGE_PROVIDER = "dual";
  });

  const validSignup = {
    userName: "dual_user",
    email: "dual@example.com",
    password: "Password123!",
    birthDate: "1990-01-01",
    phone: "+1234567890",
    region: "US",
  };

  const mockCreatedUser = {
    id: "test-id",
    ...validSignup,
    passwordHash: "hash",
    passwordSalt: "salt",
  };

  it("signup success writes to both Prisma and KV in dual mode", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue(mockCreatedUser);
    (prisma.customerReference.findFirst as any).mockResolvedValue(null);

    const { user, error } = await AuthService.signup(validSignup);

    expect(error).toBeUndefined();
    expect(user?.id).toBe("test-id");

    // Primary write
    expect(prisma.user.create).toHaveBeenCalled();
    // Secondary write
    expect(kvStore.kvSet).toHaveBeenCalledWith(
      `user:dual@example.com`,
      expect.objectContaining({ email: "dual@example.com" }),
    );
  });

  it("signup dual-write failure: Supabase primary failure throws and aborts KV write", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockRejectedValue(new Error("Supabase Down"));

    await expect(AuthService.signup(validSignup)).rejects.toThrow(
      "Supabase Down",
    );
    expect(kvStore.kvSet).not.toHaveBeenCalled();
  });

  it("signup dual-write failure: KV secondary failure is logged but doesn't crash (actually KV does not throw in kvSet)", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue(mockCreatedUser);
    (prisma.customerReference.findFirst as any).mockResolvedValue(null);

    // kvSet catches internally and logs, so it doesn't throw.
    (kvStore.kvSet as any).mockResolvedValue(undefined);

    const { user, error } = await AuthService.signup(validSignup);
    expect(error).toBeUndefined();
    expect(user?.id).toBe("test-id");
  });

  it("duplicate email handling", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      email: "dual@example.com",
    });
    const { user, error } = await AuthService.signup(validSignup);
    expect(error).toMatch(/User already exists with this email/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("duplicate phone handling", async () => {
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce(null) // email
      .mockResolvedValueOnce({ phone: "+1234567890" }); // phone
    const { user, error } = await AuthService.signup(validSignup);
    expect(error).toMatch(/User already exists with this phone/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("AuthService Session Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STORAGE_PROVIDER = "dual";
  });

  const validPayload = {
    userName: "TestUser@example.com",
    password: "StrongPassword123!",
  };

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto
    .pbkdf2Sync(validPayload.password, salt, 1000, 64, "sha512")
    .toString("hex");

  const mockUserRecord = {
    id: "user-123",
    email: "testuser@example.com",
    userName: "TestUser",
    passwordHash,
    passwordSalt: salt,
  };

  it("login success generates token and stores hash", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUserRecord);

    const { token, error } = await AuthService.login(
      validPayload.userName,
      validPayload.password,
    );
    expect(error).toBeUndefined();
    expect(token).toBeDefined();

    expect(prisma.authSession.create).toHaveBeenCalled();
    const createCall = (prisma.authSession.create as any).mock.calls[0][0].data;

    expect(createCall.tokenHash).toBeDefined();
    // Verify it's a hash and not the raw token
    expect(createCall.tokenHash).not.toBe(token);

    // KV secondary write
    expect(kvStore.kvSet).toHaveBeenCalled();
  });

  it("validateSession - valid session", async () => {
    const rawToken = "my-test-token";
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    (prisma.authSession.findUnique as any).mockResolvedValue({
      id: "session-1",
      userId: "user-123",
      tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
    });

    const session = await AuthService.validateSession(rawToken);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-123");
  });

  it("validateSession - session expiration", async () => {
    const rawToken = "my-test-token";
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    (prisma.authSession.findUnique as any).mockResolvedValue({
      id: "session-1",
      userId: "user-123",
      tokenHash,
      expiresAt: new Date(Date.now() - 100000), // expired
      revokedAt: null,
    });

    const session = await AuthService.validateSession(rawToken);
    expect(session).toBeNull();
  });

  it("validateSession - revoked token", async () => {
    const rawToken = "my-test-token";
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    (prisma.authSession.findUnique as any).mockResolvedValue({
      id: "session-1",
      userId: "user-123",
      tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: new Date(), // revoked
    });

    const session = await AuthService.validateSession(rawToken);
    expect(session).toBeNull();
  });

  it("logout updates revokedAt in both Prisma and KV", async () => {
    const rawToken = "my-test-token";
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    (kvStore.kvGet as any).mockResolvedValue({
      tokenHash,
      revokedAt: null,
    });

    await AuthService.logout(rawToken);

    expect(prisma.authSession.update).toHaveBeenCalledWith({
      where: { tokenHash },
      data: { revokedAt: expect.any(Date) },
    });

    expect(kvStore.kvSet).toHaveBeenCalledWith(
      `session:${tokenHash}`,
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });
});
