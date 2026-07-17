import { NextResponse } from "next/server";
import { SmsConsentMessageRepository } from "@/repositories/sms-consent-repository";

const repo = new SmsConsentMessageRepository();

export async function POST(request: Request) {
  const bodyStr = await request.text();
  const params = new URLSearchParams(bodyStr);

  const messageSid = params.get("MessageSid");
  const messageStatus = params.get("MessageStatus");

  if (messageSid && messageStatus) {
    // In a real webhook from Twilio, we'd update the status
    // If it doesn't exist, we might not be able to do much, but let's try upserting
    await repo.upsert({
      messageSid,
      status: messageStatus,
      userId: null, // Depending on the payload, we might not have it
      phoneNumber: params.get("To") || "unknown",
      simulated: false,
    });
  }

  return new NextResponse("OK", { status: 200 });
}
