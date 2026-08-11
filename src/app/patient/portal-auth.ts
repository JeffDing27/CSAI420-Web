import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthService } from "@/lib/service/auth.service";
import { UserRepository } from "@/lib/repository/user.repository";

export type PatientPortalUser = {
  id?: string;
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

  let localUser = await UserRepository.findByEmail(identity);
  if (!localUser) {
    localUser = await UserRepository.findByUserName(identity);
  }

  if (localUser && localUser.role !== "PATIENT") {
    redirect("/patient/login");
  }

  if (localUser) {
    return {
      token,
      stediMode: true,
      user: {
        id: localUser.id,
        userName: localUser.userName,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        email: localUser.email,
        phone: localUser.phone,
        birthDate: localUser.birthDate,
        region: localUser.region,
        role: "PATIENT",
      },
    } as PatientPortalContext;
  }

  const fallbackName = identity.includes("@") ? identity.split("@")[0] : identity;

  return {
    token,
    stediMode: true,
    user: {
      userName: fallbackName,
      firstName: fallbackName,
      lastName: "",
      email: identity.includes("@") ? identity : `${identity}@unknown.local`,
      phone: "",
      birthDate: "",
      region: "",
      role: "PATIENT",
    },
  } as PatientPortalContext;
}
