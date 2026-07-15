import { getConsent, setConsent } from "@/utils/consent-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customer: string }> }
) {
  const { customer } = await params;
  
  // Accept token header per requirements
  const token = request.headers.get("suresteps.session.token") || request.headers.get("x-suresteps-session-token");
  
  const consent = await getConsent(customer);
  return new Response(consent ? "true" : "false", { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customer: string }> }
) {
  const { customer } = await params;
  
  // Accept token header per requirements
  const token = request.headers.get("suresteps.session.token") || request.headers.get("x-suresteps-session-token");
  
  const body = await request.text();
  const value = body.trim().toLowerCase() === "true";
  
  await setConsent(customer, value);
  
  return new Response("Consent updated successfully.", { status: 200 });
}
