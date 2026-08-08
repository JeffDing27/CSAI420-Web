"use server";

import { cookies } from "next/headers";
import { AuthService } from "@/lib/service/auth.service";
import { UserRepository } from "@/lib/repository/user.repository";

const STEDI_BASE_URL = process.env.STEDI_API_BASE_URL || "https://dev.stedi.me";

function normalizeLoginToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string" && parsed) return parsed;
    if (typeof parsed?.token === "string" && parsed.token) return parsed.token;
  } catch {
    return trimmed;
  }

  return null;
}

export async function loginPatient(userNameOrEmail: string, password: string) {
  const normalizedInput = userNameOrEmail.trim();
  if (!normalizedInput || !password) {
    return { error: "Email/username and password are required." };
  }

  const localMode = process.env.USE_LOCAL_USER_STORE === "true";
  const cookieStore = await cookies();

  if (!localMode) {
    const response = await fetch(`${STEDI_BASE_URL}/login`, {
      method: "POST",
      headers: {
        accept: "text/plain, application/json;q=0.9, */*;q=0.8",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        userName: normalizedInput,
        password,
      }),
      cache: "no-store",
    });

    const rawBody = await response.text();
    if (!response.ok) {
      return { error: rawBody || "Invalid credentials" };
    }

    const token = normalizeLoginToken(rawBody);
    if (!token) {
      return { error: "STEDI login did not return a valid token." };
    }

    cookieStore.set("suresteps.session.token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    cookieStore.set("patient.portal.identity", normalizedInput.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return { success: true };
  }

  const { token, error } = await AuthService.login(normalizedInput, password);
  if (error || !token) {
    return { error: error || "Invalid credentials" };
  }

  const session = await AuthService.validateSession(token);
  if (!session) {
    return { error: "Unable to create a session." };
  }

  const user = await UserRepository.findById(session.userId);
  if (!user || user.role !== "PATIENT") {
    await AuthService.logout(token);
    return { error: "Patient access is required." };
  }

  cookieStore.set("suresteps.session.token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  cookieStore.set("patient.portal.identity", user.email.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  return { success: true };
}

export async function logoutPatient() {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  if (token) {
    try {
      await AuthService.logout(token);
    } catch (error) {
      // In STEDI mode, token may not exist in local auth session storage.
      console.warn("[Patient Logout] Local session revoke skipped:", error);
    }
  }
  cookieStore.delete("suresteps.session.token");
  cookieStore.delete("patient.portal.identity");
}
