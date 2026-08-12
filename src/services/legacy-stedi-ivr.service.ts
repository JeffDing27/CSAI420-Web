export type LegacyStediAccount = {
  email: string;
  patientName: string;
  phoneNumber: string;
  deviceId: string | null;
};

export type LegacyRapidStepTest = {
  customer: string;
  startTime: number;
  stepPoints: number[];
  stopTime: number;
  testTime: number;
  totalSteps: number;
  deviceId: string;
};

export class LegacyStediApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LegacyStediApiError";
  }
}

function baseUrl(): string {
  return (process.env.STEDI_API_BASE_URL || "https://dev.stedi.me").replace(
    /\/$/,
    "",
  );
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseToken(value: unknown): string {
  const object = asObject(value);
  const token =
    asNonEmptyString(value) ??
    asNonEmptyString(object?.token) ??
    asNonEmptyString(object?.sessionToken);
  if (!token) {
    throw new LegacyStediApiError(
      "The legacy STEDI API returned an invalid session token",
      502,
    );
  }
  return token;
}

function parseEmail(value: unknown): string {
  const object = asObject(value);
  const email =
    asNonEmptyString(value) ??
    asNonEmptyString(object?.email) ??
    asNonEmptyString(object?.userName);
  if (!email || !email.includes("@")) {
    throw new LegacyStediApiError(
      "The legacy STEDI API returned an invalid account",
      502,
    );
  }
  return email.toLowerCase();
}

function extractScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const object = asObject(value);
  if (!object) return null;
  for (const key of ["score", "riskScore", "balanceScore", "data", "result"]) {
    const score = extractScore(object[key]);
    if (score !== null) return score;
  }
  return null;
}

export function normalizeLegacyPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export class LegacyStediIvrService {
  private async request(
    path: string,
    init: RequestInit,
    timeoutMs = 10000,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
      });
      const body = parseBody(await response.text());
      if (!response.ok) {
        throw new LegacyStediApiError(
          `Legacy STEDI request failed with status ${response.status}`,
          response.status,
        );
      }
      return body;
    } catch (error) {
      if (error instanceof LegacyStediApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new LegacyStediApiError("Legacy STEDI request timed out", 504);
      }
      throw new LegacyStediApiError("Legacy STEDI service is unavailable", 502);
    } finally {
      clearTimeout(timeout);
    }
  }

  private tokenHeaders(token: string): HeadersInit {
    return {
      accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      "suresteps.session.token": token,
    };
  }

  async verifyBirthDate(
    phoneNumber: string,
    dateOfBirth: string,
  ): Promise<string> {
    const body = await this.request(
      `/birthdateverify/${encodeURIComponent(phoneNumber)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dateOfBirth }),
      },
    );
    return parseToken(body);
  }

  async validateToken(token: string): Promise<string> {
    const body = await this.request(`/validate/${encodeURIComponent(token)}`, {
      method: "GET",
    });
    return parseEmail(body);
  }

  private async optionalAccountRequest(
    path: string,
    token: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const value = await this.request(path, {
        method: "GET",
        headers: this.tokenHeaders(token),
      });
      return asObject(value);
    } catch (error) {
      if (error instanceof LegacyStediApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async resolveAccount(
    phoneNumber: string,
    token: string,
  ): Promise<LegacyStediAccount> {
    const email = await this.validateToken(token);
    const [user, customer] = await Promise.all([
      this.optionalAccountRequest(`/user/${encodeURIComponent(email)}`, token),
      this.optionalAccountRequest(
        `/customer/${encodeURIComponent(phoneNumber)}`,
        token,
      ),
    ]);
    const accounts = [customer, user].filter(
      (account): account is Record<string, unknown> => account !== null,
    );
    if (accounts.length === 0) {
      throw new LegacyStediApiError(
        "The authenticated STEDI account could not be loaded",
        404,
      );
    }
    const accountValue = (key: string): string | null => {
      for (const account of accounts) {
        const value = asNonEmptyString(account[key]);
        if (value) return value;
      }
      return null;
    };

    const firstName = accountValue("firstName");
    const lastName = accountValue("lastName");
    const patientName =
      accountValue("customerName") ??
      accountValue("name") ??
      [firstName, lastName].filter(Boolean).join(" ").trim();
    if (!patientName) {
      throw new LegacyStediApiError(
        "The authenticated STEDI account is missing a patient name",
        502,
      );
    }

    return {
      email,
      patientName,
      phoneNumber,
      deviceId: accountValue("deviceId") ?? accountValue("deviceNickName"),
    };
  }

  async submitRapidStepTest(
    token: string,
    test: LegacyRapidStepTest,
  ): Promise<void> {
    await this.request("/rapidsteptest", {
      method: "POST",
      headers: {
        ...this.tokenHeaders(token),
        "content-type": "application/json",
      },
      body: JSON.stringify(test),
    });
  }

  async getRiskScore(email: string, token: string): Promise<number> {
    const body = await this.request(`/riskscore/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: this.tokenHeaders(token),
    });
    const score = extractScore(body);
    if (score === null) {
      throw new LegacyStediApiError(
        "The legacy STEDI API returned an invalid risk score",
        502,
      );
    }
    return score;
  }
}
