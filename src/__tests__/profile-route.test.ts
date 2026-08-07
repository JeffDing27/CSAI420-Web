import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../app/user/profile/route";
import { StediAuthService } from "@/lib/service/stedi-auth.service";

vi.mock("@/lib/service/stedi-auth.service", () => ({
  StediAuthService: {
    resolveAuthenticatedProfile: vi.fn(),
    getLegacyUser: vi.fn(),
  },
}));

describe("GET /user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProfile = {
    id: "profile-123",
    role: "PATIENT",
    externalEmail: "test@example.com",
  };

  const mockLegacyUser = {
    userName: "testuser",
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    phone: "1234567890",
    birthDate: "1990-01-01",
    region: "US",
  };

  it("returns 401 without a token", async () => {
    vi.mocked(StediAuthService.resolveAuthenticatedProfile).mockResolvedValue({
      error: "Unauthorized",
      status: 401,
    });

    const request = new Request("http://localhost/user/profile", {
      headers: new Headers(),
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 for invalid or expired sessions", async () => {
    vi.mocked(StediAuthService.resolveAuthenticatedProfile).mockResolvedValue({
      error: "Invalid or expired session",
      status: 401,
    });

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

  it("returns 200 with safe profile information (Authorization Bearer)", async () => {
    vi.mocked(StediAuthService.resolveAuthenticatedProfile).mockResolvedValue({
      profile: mockProfile as any,
    });
    vi.mocked(StediAuthService.getLegacyUser).mockResolvedValue(mockLegacyUser);

    const request = new Request("http://localhost/user/profile", {
      headers: new Headers({
        authorization: "Bearer valid-token",
      }),
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.id).toBe(mockProfile.id);
    expect(data.email).toBe(mockLegacyUser.email);
    expect(data.passwordHash).toBeUndefined();
    expect(data.passwordSalt).toBeUndefined();
    expect(data.role).toBe("PATIENT");
  });

  it("returns 200 with safe profile information (x-suresteps-session-token)", async () => {
    vi.mocked(StediAuthService.resolveAuthenticatedProfile).mockResolvedValue({
      profile: mockProfile as any,
    });
    vi.mocked(StediAuthService.getLegacyUser).mockResolvedValue(mockLegacyUser);

    const request = new Request("http://localhost/user/profile", {
      headers: new Headers({
        "x-suresteps-session-token": "valid-token",
      }),
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.id).toBe(mockProfile.id);
    expect(data.passwordHash).toBeUndefined();
    expect(data.passwordSalt).toBeUndefined();
    expect(data.role).toBe("PATIENT");
  });
});
