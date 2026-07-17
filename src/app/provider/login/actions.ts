"use server";

import { AuthService } from "@/lib/service/auth.service";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function loginClinician(email: string, passwordHash: string) {
  // In a real app we'd take plaintext and hash it, but the mobile app currently takes raw pbkdf2 hash, 
  // so we'll match that contract or just allow password directly if it's already a hash.
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user || user.passwordHash !== passwordHash) {
    return { error: "Invalid credentials" };
  }

  if (user.role !== "CLINICIAN" && user.role !== "ADMIN") {
    return { error: "Access denied. Clinician role required." };
  }

  // Use AuthService to create session
  const tokenStr = await AuthService.createSession(user.id);
  
  const cookieStore = await cookies();
  cookieStore.set("suresteps.session.token", tokenStr, {
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
