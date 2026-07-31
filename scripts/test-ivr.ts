/**
 * Simulates the complete Twilio IVR flow against a running local server.
 * Start the app with USE_MOCK_TEST_DEVICE=true and IVR_REST_SECONDS=0.
 */

const BASE_URL = "http://localhost:3000";
const CALL_SID = "CA_simulate_1234567890";

async function callVoice(params: Record<string, string> = {}) {
  const body = new URLSearchParams({
    CallSid: CALL_SID,
    From: "+15551234567",
    To: "+15559876543",
    ...params,
  });
  const response = await fetch(`${BASE_URL}/api/voice-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await response.text();
  console.log(`Voice ${response.status}: ${text}`);
  if (!response.ok) throw new Error(`Voice request failed: ${response.status}`);
}

async function sendSteps(steps: number) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.IVR_SENSOR_WEBHOOK_SECRET) {
    headers["x-ivr-sensor-secret"] = process.env.IVR_SENSOR_WEBHOOK_SECRET;
  }

  const response = await fetch(`${BASE_URL}/api/voice/sensor`, {
    method: "POST",
    headers,
    body: JSON.stringify({ callSid: CALL_SID, event: "step", steps }),
  });
  console.log(`Sensor ${response.status}: ${await response.text()}`);
  if (!response.ok)
    throw new Error(`Sensor request failed: ${response.status}`);
}

async function runTest() {
  await callVoice();
  await callVoice({ SpeechResult: "Test User" });
  await callVoice({ Digits: "1" });
  await callVoice({ Digits: "01011990" });
  await callVoice({ Digits: "1" });
  await callVoice({ Digits: "1" });
  await callVoice({ Digits: "2" });
  await callVoice({ Digits: "1" });

  await sendSteps(30);
  await callVoice();
  await callVoice();
  await callVoice({ Digits: "1" });

  await sendSteps(30);
  await callVoice();
  await callVoice();

  console.log("IVR simulation complete.");
}

runTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
