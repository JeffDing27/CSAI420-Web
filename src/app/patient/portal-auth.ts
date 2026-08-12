import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/service/auth.service";
import { UserRepository } from "@/lib/repository/user.repository";
import { StediAuthService } from "@/lib/service/stedi-auth.service";

export type PatientPortalUser = {
  id?: string;
  profileId?: string;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  region: string;
  role: "PATIENT";
};

export type PatientPortalContext = {
  token: string;
  stediMode: boolean;
  user: PatientPortalUser;
};

export async function getPatientPortalUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value || "";
  const localMode = process.env.USE_LOCAL_USER_STORE === "true";

  if (!token) {
    redirect("/patient/login");
  }

  if (localMode) {
    const session = await AuthService.validateSession(token);
    if (!session) {
      redirect("/patient/login");
    }

    const user = await UserRepository.findById(session.userId);
    if (!user || user.role !== "PATIENT") {
      redirect("/patient/login");
    }

    return {
      token,
      stediMode: false,
      user: {
        id: user.id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate,
        region: user.region,
        role: "PATIENT",
      },
    } as PatientPortalContext;
  }

  const identity = cookieStore.get("patient.portal.identity")?.value || "";
  if (!identity) {
    redirect("/patient/login");
  }

  const { email, error: validationError } = await StediAuthService.validateToken(token);
  if (validationError || !email) {
    redirect("/patient/login");
  }

  const profile = await StediAuthService.upsertProfile(email);
  if (profile.role !== "PATIENT") {
    redirect("/patient/login");
  }

  const legacyUser = await StediAuthService.getLegacyUser(email, token);
  const fallbackName = email.split("@")[0];

  return {
    token,
    stediMode: true,
    user: {
      profileId: profile.id,
      userName: legacyUser?.userName || fallbackName,
      firstName: legacyUser?.firstName || fallbackName,
      lastName: legacyUser?.lastName || "",
      email: email,
      phone: legacyUser?.phone || "",
      birthDate: legacyUser?.birthDate || "",
      region: legacyUser?.region || "",
      role: "PATIENT",
    },
  } as PatientPortalContext;
}
