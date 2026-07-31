import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as SensorUpdate } from "@/app/api/voice/sensor/route";
import { POST as VoiceAuth } from "@/app/api/voice-auth/route";
import { resetVoiceTestSessions } from "@/services/voice.service";

const CALL_SID = "CA_ivr_complete_flow";

async function callVoice(params: Record<string, string> = {}) {
  const body = new URLSearchParams({ CallSid: CALL_SID, ...params });
  return VoiceAuth(
    new Request("http://localhost/api/voice-auth", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
}

async function twiml(params: Record<string, string> = {}) {
  return (await callVoice(params)).text();
}

async function sendSteps(steps: number) {
  return SensorUpdate(
    new Request("http://localhost/api/voice/sensor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callSid: CALL_SID, event: "step", steps }),
    }),
  );
}

describe("STEDI guided IVR", () => {
  beforeEach(() => {
    resetVoiceTestSessions();
    vi.stubEnv("IVR_REST_SECONDS", "0");
    vi.stubEnv("IVR_TEST_SCORE", "2.4");
  });

  it("authenticates with confirmed name and date of birth", async () => {
    expect(await twiml()).toContain("say your first and last name");
    expect(await twiml({ SpeechResult: "Test User" })).toContain(
      "I heard Test User",
    );
    expect(await twiml({ Digits: "1" })).toContain("date of birth");

    const authenticated = await twiml({ Digits: "01011990" });
    expect(authenticated).toContain("Your identity is verified");
    expect(authenticated).toContain("Do not look into the device lasers");
  });

  it("runs two sensor-counted sets and announces the score", async () => {
    await twiml();
    await twiml({ SpeechResult: "Test User" });
    await twiml({ Digits: "1" });
    await twiml({ Digits: "01011990" });

    expect(await twiml({ Digits: "1" })).toContain("bottom receptacle");
    expect(await twiml({ Digits: "1" })).toContain("foot you would use");
    expect(await twiml({ Digits: "2" })).toContain("right foot");
    expect(await twiml({ Digits: "1" })).toContain("Set one has started");

    expect((await sendSteps(30)).status).toBe(200);
    expect(await twiml()).toContain("Set one is complete");
    expect(await twiml()).toContain("Your rest is complete");
    expect(await twiml({ Digits: "1" })).toContain("Set two has started");

    expect((await sendSteps(30)).status).toBe(200);
    expect(await twiml()).toContain("calculate your score");
    const result = await twiml();
    expect(result).toContain("balance score is 2.4");
    expect(result).toContain("not a diagnosis");
    expect(result).toContain("store it safely away from children");
  });

  it("pauses, resumes, and rejects invalid sensor counts", async () => {
    await twiml();
    await twiml({ SpeechResult: "Test User" });
    await twiml({ Digits: "1" });
    await twiml({ Digits: "01011990" });
    await twiml({ Digits: "1" });
    await twiml({ Digits: "1" });
    await twiml({ Digits: "1" });
    await twiml({ Digits: "1" });

    expect(await twiml({ Digits: "2" })).toContain("exercise is paused");
    expect(await twiml({ Digits: "1" })).toContain("exercise is resuming");

    const invalid = await sendSteps(31);
    expect(invalid.status).toBe(400);
  });
});
