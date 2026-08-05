import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../app/user/profile/route";
import { AuthService } from "@/lib/service/auth.service";
import { UserRepository } from "@/lib/repository/user.repository";

vi.mock("@/lib/service/auth.service", () => ({
  AuthService: {
    validateSession: vi.fn(),
  },
}));

vi.mock("@/lib/repository/user.repository", () => ({
  UserRepository: {
    findById: vi.fn(),
  },
}));

describe("GET /user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "user-123",
    userName: "testuser",
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    phone: "1234567890",
    birthDate: "1990-01-01",
    region: "US",
    role: "PATIENT",
    passwordHash: "secret-hash",
    passwordSalt: "secret-salt",
  };

  it("returns 401 without a token", async () => {
    const request = new Request("http://localhost/user/profile", {
      headers: new Headers(),
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 for invalid or expired sessions", async () => {
    vi.mocked(AuthService.validateSession).mockResolvedValue(null);

    const request = new Request("http://localhost/user/profile", {
      headers: new Headers({
        authorization: "Bearer invalid-token",
      }),
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Invalid or expired session");
  });

  it("returns 404 when the user does not exist", async () => {
    vi.mocked(AuthService.validateSession).mockResolvedValue({
      id: "session-123",
      userId: "non-existent-user",
      tokenHash: "hash",
      deviceTokenHash: null,
      deviceId: null,
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
    });
    vi.mocked(UserRepository.findById).mockResolvedValue(null);

    const request = new Request("http://localhost/user/profile", {
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });

    const response = await GET(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("User not found");
  });

  it("returns 200 with safe profile information (Authorization Bearer)", async () => {
    vi.mocked(AuthService.validateSession).mockResolvedValue({
      id: "session-123",
      userId: "user-123",
      tokenHash: "hash",
      deviceTokenHash: null,
      deviceId: null,
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
    });
    // @ts-ignore
    vi.mocked(UserRepository.findById).mockResolvedValue(mockUser);

    const request = new Request("http://localhost/user/profile", {
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.id).toBe(mockUser.id);
    expect(data.email).toBe(mockUser.email);
    expect(data.passwordHash).toBeUndefined();
    expect(data.passwordSalt).toBeUndefined();
  });

  it("returns 200 with safe profile information (x-suresteps-session-token)", async () => {
    vi.mocked(AuthService.validateSession).mockResolvedValue({
      id: "session-123",
      userId: "user-123",
      tokenHash: "hash",
      deviceTokenHash: null,
      deviceId: null,
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
    });
    // @ts-ignore
    vi.mocked(UserRepository.findById).mockResolvedValue(mockUser);

    const request = new Request("http://localhost/user/profile", {
      headers: new Headers({
        "x-suresteps-session-token": "valid-token",
      }),
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.id).toBe(mockUser.id);
    expect(data.passwordHash).toBeUndefined();
    expect(data.passwordSalt).toBeUndefined();
  });
});
