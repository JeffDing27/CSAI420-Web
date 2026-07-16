import { NextResponse } from "next/server";
import { VoiceService } from "@/services/voice.service";
import twilio from "twilio";

const { VoiceResponse } = twilio.twiml;
const voiceService = new VoiceService();

export async function POST(request: Request) {
  const bodyStr = await request.text();
  const params = new URLSearchParams(bodyStr);
  const speech = params.get("SpeechResult");
  const callSid = params.get("CallSid") || "test_sid";

  const twiml = new VoiceResponse();

  if (speech) {
    // Here we would pass the speech text to LangGraph
    // For now, simple mock
    let answer =
      "I heard your question. Please ensure you do the sitting to standing exercise safely.";
    if (
      speech.toLowerCase().includes("pain") ||
      speech.toLowerCase().includes("dizzy")
    ) {
      answer =
        "Since you mentioned pain or dizziness, I am escalating this to a human medical coach. They will contact you shortly.";
      // Trigger escalation here in reality
    }
    
    await voiceService.updateSession(callSid, {
      stage: "AWAITING_TEST_CHOICE"
    });

    twiml.say({ voice: "Polly.Joanna" }, answer);

    const gather = twiml.gather({
      input: ["speech", "dtmf"],
      action: "/api/voice/ask",
      timeout: 5,
    });

    gather.say({ voice: "Polly.Joanna" }, "Do you have any other questions?");
  } else {
    twiml.say({ voice: "Polly.Joanna" }, "I didn't catch that. Goodbye.");
    
    await voiceService.updateSession(callSid, {
      callStatus: "completed"
    });

    twiml.hangup();
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
