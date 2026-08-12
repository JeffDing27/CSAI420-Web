import { Profile, ProfileRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STEDI_API_BASE_URL = process.env.STEDI_API_BASE_URL || "https://dev.stedi.me";

interface AuthResult {
  token?: string;
  error?: string;
  status?: number;
}

interface ValidateResult {
  email?: string;
  error?: string;
  status?: number;
}

interface ProfileResult {
  profile?: Profile;
  error?: string;
  status?: number;
}

export class StediAuthService {
  /**
   * Helper for robust upstream fetch with timeout
   */
  private static async fetchUpstream(
    path: string,
    options: RequestInit,
    timeoutMs = 10000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${STEDI_API_BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Upstream timeout");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  static async login(userName: string, password: string): Promise<AuthResult> {
    try {
      const response = await this.fetchUpstream("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userName, password }),
      });

      if (!response.ok) {
        return {
          error: "Invalid credentials or upstream error",
          status: response.status === 401 ? 401 : 502,
        };
      }

      const text = await response.text();
      let token = text;
      
      // Sometimes APIs return a JSON string instead of raw text
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === "string") {
          token = parsed;
        } else if (parsed && parsed.token) {
          token = parsed.token;
        }
      } catch (e) {
        // Assume raw text token if JSON parsing fails
      }

      return { token };
    } catch (error) {
      return { error: "Upstream service unavailable", status: 504 };
    }
  }

  static async validateToken(token: string): Promise<ValidateResult> {
    try {
      const response = await this.fetchUpstream(`/validate/${token}`, {
        method: "GET",
      });

      if (!response.ok) {
        return {
          error: "Invalid or expired session",
          status: response.status === 401 ? 401 : 502,
        };
      }

      const text = await response.text();
      let email = text;

      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === "string") {
          email = parsed;
        } else if (parsed && parsed.email) {
          email = parsed.email;
        }
      } catch (e) {
        // Assume raw text email if JSON parsing fails
      }

      if (!email || !email.includes("@")) {
        return { error: "Invalid validation response from upstream", status: 502 };
      }

      return { email };
    } catch (error) {
      return { error: "Upstream service unavailable", status: 504 };
    }
  }

  static async getLegacyUser(email: string, token: string): Promise<any> {
    try {
      const response = await this.fetchUpstream(`/user/${email}`, {
        method: "GET",
        headers: {
          "suresteps.session.token": token,
        },
      });

      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  static async upsertProfile(email: string): Promise<Profile> {
    const normalizedEmail = email.trim().toLowerCase();

    // Default to PATIENT. This can only be promoted externally by trusted admin code.
    const profile = await prisma.profile.upsert({
      where: { externalEmail: normalizedEmail },
      update: {},
      create: {
        externalEmail: normalizedEmail,
        role: ProfileRole.PATIENT,
      },
    });

    return profile;
  }

  static async resolveAuthenticatedProfile(request: Request): Promise<ProfileResult> {
    // 1. Extract Token (Accept either Authorization Bearer or suresteps.session.token)
    const possibleHeaders = [
      "suresteps.session.token",
      "x-suresteps-session-token",
      "suresteps-session-token",
      "authorization",
    ];

    let token: string | null = null;
    request.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (possibleHeaders.includes(lowerKey)) {
        if (lowerKey === "authorization" && val.startsWith("Bearer ")) {
          if (!token) token = val.substring(7);
        } else {
          if (!token) token = val;
        }
      }
    });

    if (!token) {
      return { error: "Unauthorized", status: 401 };
    }

    // 2. Validate token upstream
    const { email, error, status } = await this.validateToken(token);
    
    if (error || !email) {
      return { error: error || "Unauthorized", status: status || 401 };
    }

    // 3. Upsert Profile based purely on the trusted email
    try {
      const profile = await this.upsertProfile(email);
      return { profile };
    } catch (dbError) {
      console.error("Database error upserting profile:", dbError);
      return { error: "Internal Server Error", status: 500 };
    }
  }
}
