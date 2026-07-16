import { NextResponse } from "next/server";
import { VoiceService } from "@/services/voice.service";
import twilio from "twilio";

const { VoiceResponse } = twilio.twiml;
const voiceService = new VoiceService();

export async function POST(request: Request) {
  const bodyStr = await request.text();
  const params = new URLSearchParams(bodyStr);
  const digits = params.get("Digits");
  const speech = params.get("SpeechResult");

  const input = digits || (speech ? speech.replace(/\D/g, "") : null);
  const callSid = params.get("CallSid") || "test_sid";

  const twiml = new VoiceResponse();

  if (input && input.length >= 10) {
    // In a real system, look up user by phone number. For mock, accept it.
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
      phoneNumber: input,
    });
  } else {
    twiml.say(
      { voice: "Polly.Joanna" },
      "Sorry, we could not verify that number.",
    );
    await voiceService.updateSession(callSid, {
      authenticationAttempts: 1, // Just setting it to 1 for this mock flow
    });
    twiml.redirect("/api/voice/incoming");
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
