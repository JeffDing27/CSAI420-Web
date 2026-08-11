"use server";

import { revalidatePath } from "next/cache";
import { DeviceService } from "@/services/device.service";
import { getPatientPortalUser } from "../../portal-auth";

export async function claimPatientDevice(formData: FormData) {
  const { user } = await getPatientPortalUser();

  if (!user.id) {
    return {
      error:
        "This STEDI-only account is not mapped to a local patient profile, so device claiming is unavailable.",
    };
  }

  const claimCode = String(formData.get("claimCode") || "").trim();

  if (!/^\d{6}$/.test(claimCode)) {
    return { error: "Claim code must be 6 digits." };
  }

  try {
    await DeviceService.claimDevice({
      userId: user.id,
      claimCode,
      method: "MOBILE" as any,
    });
    revalidatePath("/patient");
    revalidatePath("/patient/devices");
    return { success: true };
  } catch (error: any) {
    return {
      error: error?.message || "Unable to claim device.",
    };
  }
}
