"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/service/auth.service";
import { revalidatePath } from "next/cache";

export async function createAccessRequest(patientEmail: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("suresteps.session.token")?.value;
  const session = await AuthService.validateSession(token || "");
  if (!session) return { error: "Not logged in" };

  const clinician = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!clinician) return { error: "User not found" };

  // Check if patient exists
  const patient = await prisma.user.findUnique({
    where: { email: patientEmail }
  });

  if (!patient || patient.role !== "PATIENT") {
    return { error: "Patient not found" };
  }

  // Check if already consented
  const existingConsent = await prisma.consentedClinician.findFirst({
    where: {
      customer: patientEmail,
      clinicianUsername: clinician.userName
    }
  });

  if (existingConsent) {
    return { error: "You already have access to this patient." };
  }

  // Create request
  await prisma.clinicianAccessRequest.upsert({
    where: {
      customerEmail_clinicianUsername: {
        customerEmail: patientEmail,
        clinicianUsername: clinician.userName
      }
    },
    update: {
      status: "pending",
      requestDate: new Date()
    },
    create: {
      customerEmail: patientEmail,
      clinicianUsername: clinician.userName,
      status: "pending",
      requestDate: new Date()
    }
  });

  revalidatePath("/provider/access-requests");
  return { success: true };
}
