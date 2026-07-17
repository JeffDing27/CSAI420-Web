import { createHash } from "node:crypto";
import { SmsConsentMessageRepository } from "@/repositories/sms-consent-repository";

const repository = new SmsConsentMessageRepository();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phoneNumber =
    typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber) || body?.consent !== true) {
    return Response.json(
      { error: "Valid phone number and affirmative consent are required" },
      { status: 400 },
    );
  }

  const consentKey = createHash("sha256")
    .update(phoneNumber)
    .digest("hex")
    .slice(0, 32);
  await repository.upsert({
    messageSid: `consent:${consentKey}`,
    userId: null,
    phoneNumber,
    status: "opted-in:2026-07-17",
    simulated: false,
  });

  return Response.json({ recorded: true }, { status: 201 });
}
