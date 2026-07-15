import { getConsent, setConsent } from "@/utils/consent-store";

function hasAuth(request: Request): boolean {
  const possibleTokenHeaders = [
    "suresteps.session.token",
    "x-suresteps-session-token",
    "suresteps-session-token",
    "authorization"
  ];
  return possibleTokenHeaders.some(h => request.headers.has(h));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customer: string }> }
) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { customer } = await params;
  
  const consent = await getConsent(customer);
  return new Response(consent ? "true" : "false", { status: 200, headers: { "content-type": "text/plain" } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customer: string }> }
) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { customer } = await params;
  
  const body = await request.text();
  const normalizedBody = body.trim().toLowerCase();
  
  if (normalizedBody !== "true" && normalizedBody !== "false") {
    return new Response("Invalid body, must be 'true' or 'false'", { status: 400 });
  }
  
  const value = normalizedBody === "true";
  
  await setConsent(customer, value);
  
  return new Response("Consent updated successfully.", { status: 200 });
}
