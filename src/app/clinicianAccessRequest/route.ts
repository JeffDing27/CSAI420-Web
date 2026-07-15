import { addClinicianAccessRequest, deleteClinicianAccessRequest } from "@/utils/clinician-access-store";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  await addClinicianAccessRequest(customerEmail, clinicianUsername);

  // Return plain text as requested by tests
  return new Response("Access request submitted successfully", { status: 201 });
}

export async function DELETE(request: Request) {
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

  const deleted = await deleteClinicianAccessRequest(customerEmail, clinicianUsername);
  
  if (!deleted) {
    return new Response("Request not found", { status: 404 });
  }

  // Return plain text as requested by tests
  return new Response("Access request deleted successfully", { status: 200 });
}
