export interface ClinicianAccessRequest {
  clinicianUsername: string;
  customerEmail: string;
  requestDate: string;
  status: "pending" | "approved" | "denied";
}

import { kvGet, kvSet } from "./kv-store";

export async function addClinicianAccessRequest(
  customerEmail: string,
  clinicianUsername: string,
): Promise<void> {
  const normalizedEmail = decodeURIComponent(customerEmail)
    .trim()
    .toLowerCase();
  const normalizedClinician = clinicianUsername.trim().toLowerCase();

  const indexKey = `clinicianAccessRequestIndex:${normalizedEmail}`;
  const requestKey = `clinicianAccessRequest:${normalizedEmail}:${normalizedClinician}`;

  const requestDate = new Date().toISOString();

  const newRequest: ClinicianAccessRequest = {
    clinicianUsername, // Preserve original case
    customerEmail, // Preserve original case for the JSON output
    requestDate,
    status: "pending",
  };

  // 1. Save request object to the individual request key using kvSet
  await kvSet(requestKey, newRequest);

  // 2. Read index array from index key
  const index: string[] = (await kvGet<string[]>(indexKey)) || [];

  // 3. Add normalizedClinicianUsername if not already present
  if (!index.includes(normalizedClinician)) {
    index.push(normalizedClinician);
  }

  // 4. Save the updated index array using kvSet
  await kvSet(indexKey, index);

  // 5. Immediately read back the individual request key and index key
  await kvGet<ClinicianAccessRequest>(requestKey);
  await kvGet<string[]>(indexKey);
}

export async function getClinicianAccessRequests(
  customerEmail: string,
): Promise<ClinicianAccessRequest[]> {
  const normalizedEmail = decodeURIComponent(customerEmail)
    .trim()
    .toLowerCase();
  const indexKey = `clinicianAccessRequestIndex:${normalizedEmail}`;

  const index = (await kvGet<string[]>(indexKey)) || [];

  const requests: ClinicianAccessRequest[] = [];

  for (const clinician of index) {
    const requestKey = `clinicianAccessRequest:${normalizedEmail}:${clinician}`;
    const req = await kvGet<ClinicianAccessRequest>(requestKey);
    if (req) {
      requests.push(req);
    }
  }

  return requests;
}

export async function deleteClinicianAccessRequest(
  customerEmail: string,
  clinicianUsername: string,
): Promise<boolean> {
  const normalizedEmail = decodeURIComponent(customerEmail)
    .trim()
    .toLowerCase();
  const normalizedClinician = clinicianUsername.trim().toLowerCase();

  const indexKey = `clinicianAccessRequestIndex:${normalizedEmail}`;
  const requestKey = `clinicianAccessRequest:${normalizedEmail}:${normalizedClinician}`;

  const req = await kvGet<ClinicianAccessRequest>(requestKey);
  if (!req) {
    return false;
  }

  // Remove the clinician key from the index and save the index
  let index = (await kvGet<string[]>(indexKey)) || [];
  index = index.filter((c) => c !== normalizedClinician);
  await kvSet(indexKey, index);

  // Delete the individual request key by setting to null
  await kvSet(requestKey, null);

  return true;
}
