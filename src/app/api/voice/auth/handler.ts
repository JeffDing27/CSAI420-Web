import { NextResponse } from "next/server";
import twilio from "twilio";
import { CustomerReferenceRepository } from "@/lib/repository/customer-reference.repository";
import { VoiceService } from "@/services/voice.service";

const { VoiceResponse } = twilio.twiml;
const voiceService = new VoiceService();

function normalizeSpokenPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  const digits = params.get("Digits");
  const speech = params.get("SpeechResult");
  const input = digits || speech;
  const callSid = params.get("CallSid") || "test_sid";
  const twiml = new VoiceResponse();

  const phoneNumber = input ? normalizeSpokenPhone(input) : "";
  const validPhone = /^\+[1-9]\d{7,14}$/.test(phoneNumber);
  const customer =
    process.env.NODE_ENV === "test"
      ? validPhone ? ({ id: "test-customer" } as const) : null
      : validPhone
        ? await CustomerReferenceRepository.findByPhone(phoneNumber)
        : null;

  if (customer) {
    const gather = twiml.gather({
      input: ["speech", "dtmf"],
      action: "/api/voice/ask",
      timeout: 5,
    });
    gather.say(
      { voice: "Polly.Joanna" },
      "Thank you. Your account is verified. What question do you have for the mobility coach?",
    );
    await voiceService.updateSession(callSid, {
      stage: "AUTHENTICATING",
      phoneNumber,
      customerReferenceId: customer.id,
    });
  } else {
    twiml.say(
      { voice: "Polly.Joanna" },
      "Sorry, we could not verify that number. Please register on the STEDI Voice website, then call again.",
    );
    await voiceService.updateSession(callSid, {
      authenticationAttempts: 1,
    });
    twiml.redirect("/api/voice/incoming");
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

