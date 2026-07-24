import { NextRequest, NextResponse } from "next/server";
import { ClinicianAccessRequestService } from "@/services/clinician-access-request.service";
import { hasAuth } from "@/utils/auth";

const service = new ClinicianAccessRequestService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer: string }> },
) {
  const { customer } = await params;

  // Accept token header per requirements
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Format to match STEDI mock
  const data = await service.getRequests(customer);
  const formatted = data.map((req) => ({
    clinicianUsername: req.clinicianUsername,
    customerEmail: req.customerEmail,
    status: req.status,
    requestDate: req.requestDate.toISOString(),
  }));

  return NextResponse.json(formatted, { status: 200 });
}
