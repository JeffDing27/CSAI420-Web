"use server";

import { AuthService } from "@/lib/service/auth.service";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function loginClinician(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  // Find user by email first to enforce clinician/admin-only portal access.
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    return { error: "Invalid credentials" };
  }

  if (user.role !== "CLINICIAN" && user.role !== "ADMIN") {
    return { error: "Access denied. Clinician role required." };
  }

  // Validate password using the same login path as the public /login endpoint.
  const { token, error } = await AuthService.login(normalizedEmail, password);
  if (error || !token) {
    return { error: "Invalid credentials" };
  }
  
  const cookieStore = await cookies();
  cookieStore.set("suresteps.session.token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });

  return { success: true };
}

export async function logoutClinician() {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  if (token) {
    await AuthService.logout(token);
    cookieStore.delete("suresteps.session.token");
  }
}
