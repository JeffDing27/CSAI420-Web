import { ConsentService } from "@/services/consent.service";

const service = new ConsentService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customer: string }> },
) {
  const { customer } = await params;

  const consent = await service.getConsent(customer);
  return new Response(consent ? "true" : "false", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customer: string }> },
) {
  const { customer } = await params;

  const body = await request.text();
  const normalizedBody = body.trim().toLowerCase();

  if (normalizedBody !== "true" && normalizedBody !== "false") {
    return new Response("Invalid body, must be 'true' or 'false'", {
      status: 400,
    });
  }

  const value = normalizedBody === "true";

  await service.setConsent(customer, value);

  return new Response("Consent updated successfully.", { status: 200 });
}
