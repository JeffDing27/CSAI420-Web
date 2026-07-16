export interface ClinicianConsent {
  clinicianUsername: string;
  consentExpirationDate: string;
}

import { kvGet, kvSet } from "./kv-store";

export async function setConsent(customer: string, value: boolean) {
  const normalizedCustomer = decodeURIComponent(customer).toLowerCase();
  await kvSet(`consent:${normalizedCustomer}`, value ? "true" : "false");
}

export async function getConsent(customer: string): Promise<boolean> {
  const normalizedCustomer = decodeURIComponent(customer).toLowerCase();
  const value = await kvGet<any>(`consent:${normalizedCustomer}`);
  return value === "true" || value === true;
}

export async function setConsentedClinician(
  customer: string,
  clinicianUsername: string,
) {
  const key = `clinicians:${customer}`;
  const clinicians: ClinicianConsent[] =
    (await kvGet<ClinicianConsent[]>(key)) || [];

  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);

  const formattedDate = expirationDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const existingIndex = clinicians.findIndex(
    (c) => c.clinicianUsername === clinicianUsername,
  );
  if (existingIndex !== -1) {
    clinicians[existingIndex].consentExpirationDate = formattedDate;
  } else {
    clinicians.push({
      clinicianUsername,
      consentExpirationDate: formattedDate,
    });
  }

  await kvSet(key, clinicians);
}

export async function getConsentedClinicians(
  customer: string,
): Promise<ClinicianConsent[]> {
  const key = `clinicians:${customer}`;
  const clinicians = await kvGet<ClinicianConsent[]>(key);
  return clinicians || [];
}
