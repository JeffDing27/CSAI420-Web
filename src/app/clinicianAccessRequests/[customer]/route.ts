import { NextResponse } from "next/server";
import { ClinicianAccessRequestService } from "@/services/clinician-access-request.service";

const service = new ClinicianAccessRequestService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customer: string }> },
) {
  const { customer } = await params;

  // Accept token header per requirements
  const token =
    request.headers.get("suresteps.session.token") ||
    request.headers.get("x-suresteps-session-token");

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
