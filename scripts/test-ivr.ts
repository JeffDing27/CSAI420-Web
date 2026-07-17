/**
 * test-ivr.ts
 *
 * Simulates Twilio requests to the local webhook endpoints to test the IVR state machine
 * without needing real Twilio credentials or ngrok.
 */

const API_URL = "http://localhost:3000/api/voice-auth";

async function simulateTwilioRequest(
  endpoint: string,
  params: Record<string, string>,
) {
  console.log(`\n--- Calling ${endpoint} ---`);
  console.log("Params:", params);

  const urlParams = new URLSearchParams(params);

  try {
    const res = await fetch(`${API_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: urlParams.toString(),
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log("TwiML Response:");
    console.log(text);
  } catch (err) {
    console.error("Error calling webhook:", err);
  }
}

async function runTest() {
  const callSid = "CA_simulate_1234567890";

  // 1. Initial incoming call (INITIAL state)
  await simulateTwilioRequest("", {
    CallSid: callSid,
    From: "+15551234567",
    To: "+15559876543",
  });

  // 2. User inputs phone number (AWAITING_PHONE state)
  await simulateTwilioRequest("", {
    CallSid: callSid,
    Digits: "1234567890",
  });

  // 3. User inputs DOB (AWAITING_DOB state)
  // Mock accepts 01011990
  await simulateTwilioRequest("", {
    CallSid: callSid,
    Digits: "01011990",
  });

  // 4. User presses 3 to record test (AWAITING_TEST_CHOICE state)
  await simulateTwilioRequest("", {
    CallSid: callSid,
    Digits: "3",
  });

  console.log("\n--- IVR Simulation Complete ---");
}

runTest();
