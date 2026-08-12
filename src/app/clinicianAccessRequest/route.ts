import { NextResponse } from "next/server";
import { ClinicianAccessRequestService } from "@/services/clinician-access-request.service";
import { hasAuth } from "@/utils/auth";
import { ConsentedClinicianService } from "@/services/consented-clinician.service";

const service = new ClinicianAccessRequestService();
const consentedClinicianService = new ConsentedClinicianService();

export async function POST(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { clinicianUsername, customerEmail } = body;
  if (!clinicianUsername || !customerEmail) {
    return new Response("Missing required fields", { status: 400 });
  }

  await service.addRequest(customerEmail, clinicianUsername);

  // Return plain text as requested by tests
  return new Response("Access request submitted successfully", { status: 201 });
}

export async function PATCH(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { id, status } = body;

  if (!id || !status) {
    return new Response("Missing required fields", { status: 400 });
  }

  if (status !== "approved" && status !== "denied") {
    return new Response("Status must be approved or denied", {
      status: 400,
    });
  }

  const existingRequest = await service.getRequestById(id);

  if (!existingRequest) {
    return new Response("Request not found", { status: 404 });
  }

  if (existingRequest.status !== "pending") {
    return new Response("Request has already been processed", {
      status: 409,
    });
  }

  const updatedRequest = await service.updateStatus(id, status);

  if (status === "approved") {
    await consentedClinicianService.addConsentedClinician(
      existingRequest.customerEmail,
      existingRequest.clinicianUsername,
    );
  }

  return NextResponse.json(updatedRequest, { status: 200 });
}

export async function DELETE(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { clinicianUsername, customerEmail } = body;
  if (!clinicianUsername || !customerEmail) {
    return new Response("Missing required fields", { status: 400 });
  }

  const deleted = await service.deleteRequest(customerEmail, clinicianUsername);

  if (!deleted) {
    return new Response("Request not found", { status: 404 });
  }

  // Return plain text as requested by tests
  return new Response("Access request deleted successfully", { status: 200 });
}
