import { NextResponse } from "next/server";
import twilio from "twilio";
import { VoiceService } from "@/services/voice.service";

const { VoiceResponse } = twilio.twiml;
const voiceService = new VoiceService();

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function answerMobilityQuestion(text: string) {
  if (includesAny(text, ["pain", "dizzy", "dizziness", "faint", "chest pain"])) {
    return "Stop the exercise and sit somewhere safe. This phone assistant cannot contact a medical coach yet. If symptoms are severe, you may fall, or you have chest pain, call emergency services. Otherwise, contact your healthcare professional before trying again.";
  }

  if (
    !includesAny(text, ["how often", "frequency", "every day", "daily", "repetitions", "how many"]) &&
    includesAny(text, ["how do i", "how to", "sit to stand", "sitting to standing", "exercise"])
  ) {
    return "For a sit to stand exercise, use a stable chair that will not roll. Place both feet flat, lean slightly forward, and stand at a comfortable pace. Keep the chair behind you when sitting back down. Stop if you feel pain or dizziness.";
  }

  if (includesAny(text, ["chair", "walker", "cane", "support", "hold on"])) {
    return "Use a firm, stable chair without wheels. Keep a counter or sturdy support nearby if your clinician has advised it. Do not pull on a walker to stand unless a healthcare professional has shown you how.";
  }

  if (includesAny(text, ["how often", "frequency", "every day", "daily", "repetitions", "how many"])) {
    return "Follow the schedule provided by your clinician. If you do not have one, begin conservatively and ask a healthcare professional what frequency and number of repetitions are appropriate for you.";
  }

  if (includesAny(text, ["balance score", "index score", "my score", "result", "results"])) {
    return "Account-based balance score retrieval is not connected to this phone assistant yet. Your account is verified, but the current prototype cannot announce a personal score.";
  }

  if (includesAny(text, ["fall", "falling", "fell", "unsteady"])) {
    return "If you feel unsteady, stop and sit down safely. Keep the area clear of obstacles and have a trusted person nearby. If you have fallen or may be injured, contact a healthcare professional or emergency services.";
  }

  if (includesAny(text, ["device", "sensor", "bluetooth", "connect"])) {
    return "Automatic sensor and device control is not connected to the voice service yet. The current phone prototype supports account verification and mobility guidance.";
  }

  return "I can help with sit to stand technique, chair safety, exercise frequency, falls, dizziness, pain, balance scores, and device status. Please ask about one of those topics.";
}

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  const speech = params.get("SpeechResult");
  const callSid = params.get("CallSid") || "test_sid";
  const twiml = new VoiceResponse();

  if (!speech?.trim()) {
    twiml.say({ voice: "Polly.Joanna" }, "I didn't catch that. Goodbye.");
    await voiceService.updateSession(callSid, { callStatus: "completed" });
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const normalized = speech.toLowerCase().replace(/[.,!?']/g, "").trim();
  const endPhrases = [
    "no",
    "nope",
    "no thank you",
    "no thanks",
    "thats all",
    "that is all",
    "goodbye",
    "bye",
    "done",
    "im done",
    "not right now",
  ];

  if (endPhrases.includes(normalized)) {
    twiml.say(
      { voice: "Polly.Joanna" },
      "You're welcome. Thank you for calling STEDI Voice. Goodbye.",
    );
    await voiceService.updateSession(callSid, {
      stage: "COMPLETED",
      callStatus: "completed",
    });
    twiml.hangup();
  } else if (["yes", "yes please", "yeah", "sure"].includes(normalized)) {
    const gather = twiml.gather({
      input: ["speech", "dtmf"],
      action: "/api/voice/ask",
      timeout: 7,
      speechTimeout: "auto",
    });
    gather.say(
      { voice: "Polly.Joanna" },
      "Okay. What else would you like to know?",
    );
    twiml.say({ voice: "Polly.Joanna" }, "I didn't hear a question. Goodbye.");
    twiml.hangup();
  } else {
    twiml.say(
      { voice: "Polly.Joanna" },
      answerMobilityQuestion(normalized),
    );
    await voiceService.updateSession(callSid, {
      stage: "AWAITING_TEST_CHOICE",
    });

    const gather = twiml.gather({
      input: ["speech", "dtmf"],
      action: "/api/voice/ask",
      timeout: 7,
      speechTimeout: "auto",
    });
    gather.say(
      { voice: "Polly.Joanna" },
      "Do you have another question? Say yes or no.",
    );
    twiml.say(
      { voice: "Polly.Joanna" },
      "I didn't hear a response. Thank you for calling. Goodbye.",
    );
    twiml.hangup();
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

