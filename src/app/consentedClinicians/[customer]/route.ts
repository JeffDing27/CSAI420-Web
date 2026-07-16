import { NextResponse } from "next/server";
import { ConsentedClinicianService } from "@/services/consented-clinician.service";

const service = new ConsentedClinicianService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customer: string }> },
) {
  const { customer } = await params;

  // Accept token header per requirements
  const token =
    request.headers.get("suresteps.session.token") ||
    request.headers.get("x-suresteps-session-token");

  const data = await service.getConsentedClinicians(customer);
  return NextResponse.json(data, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customer: string }> },
) {
  const { customer } = await params;

  // Accept token header per requirements
  const token =
    request.headers.get("suresteps.session.token") ||
    request.headers.get("x-suresteps-session-token");

  const body = await request.text();
  const clinicianUsername = body.trim();

  if (clinicianUsername) {
    await service.addConsentedClinician(customer, clinicianUsername);
  }

  return new Response("Clinician consent updated successfully.", {
    status: 200,
  });
}
