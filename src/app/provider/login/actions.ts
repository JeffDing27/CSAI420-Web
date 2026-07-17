"use server";

import { cookies } from "next/headers";
import { AuthService } from "@/lib/service/auth.service";

export async function loginClinician(email: string, password: string) {
  const result = await AuthService.login(email, password);
  if (!result.token || !result.user) {
    return { error: result.error || "Invalid credentials" };
  }

  if (result.user.role !== "CLINICIAN" && result.user.role !== "ADMIN") {
    await AuthService.logout(result.token);
    return { error: "Access denied. Clinician role required." };
  }

  const cookieStore = await cookies();
  cookieStore.set("suresteps.session.token", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return { success: true };
}

export async function logoutClinician() {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  if (token) await AuthService.logout(token);
  cookieStore.delete("suresteps.session.token");
}
