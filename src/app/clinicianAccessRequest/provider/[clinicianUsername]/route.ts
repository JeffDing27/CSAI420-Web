import { NextRequest, NextResponse } from "next/server";
import { ClinicianAccessRequestService } from "@/services/clinician-access-request.service";
import { hasAuth } from "@/utils/auth";

const service = new ClinicianAccessRequestService();

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ clinicianUsername: string }>;
  },
) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { clinicianUsername } = await params;

  const requests = await service.getRequestsForClinician(clinicianUsername);

  const formatted = requests.map((item) => ({
    id: item.id,
    clinicianUsername: item.clinicianUsername,
    customerEmail: item.customerEmail,
    status: item.status,
    requestDate: item.requestDate.toISOString(),
  }));

  return NextResponse.json(formatted, { status: 200 });
}
