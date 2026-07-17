import { VoiceStage } from "@prisma/client";
import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { RepositoryFactory } from "@/repositories/provider-factory";
import { VoiceService } from "@/services/voice.service";

const { VoiceResponse } = twilio.twiml;
const voiceService = new VoiceService();

export async function POST(request: Request) {
  const bodyStr = await request.text();
  const params = new URLSearchParams(bodyStr);
  const callSid = params.get("CallSid") || "test_sid";
  const input =
    params.get("Digits") ||
    (params.get("SpeechResult")
      ? params.get("SpeechResult")?.replace(/\D/g, "")
      : null);

  let session = await voiceService.getSession(callSid);

  // Expiration check
  if (session && session.expiresAt < new Date()) {
    session = null;
  }

  const twiml = new VoiceResponse();

  if (!session) {
    session = await voiceService.startSession(callSid);
  }

  // Idempotency: if we receive the exact same status update from twilio (like completed), don't process again
  const callStatus = params.get("CallStatus");
  if (callStatus === "completed" && session.callStatus === "completed") {
    return new NextResponse("OK", { status: 200 });
  }

  const userRepo = RepositoryFactory.getUserRepository();

  if (session.authenticationAttempts >= 3) {
    await voiceService.updateSession(callSid, { stage: VoiceStage.FAILED });
    twiml.say({ voice: "Polly.Joanna" }, "Too many failed attempts. Goodbye.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  switch (session.stage) {
    case VoiceStage.INITIAL:
    case VoiceStage.AWAITING_PHONE: {
      if (!input || input.length < 10) {
        const gather = twiml.gather({
          input: ["dtmf"],
          action: "/api/voice-auth",
          numDigits: 10,
          timeout: 5,
        });
        gather.say(
          { voice: "Polly.Joanna" },
          "Hello, and welcome to our authentication service. Please enter your 10-digit phone number, followed by the pound key.",
        );
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.AWAITING_PHONE,
        });
      } else {
        // Phone collected
        const normalizedPhone = input.replace(/\D/g, "");
        const custRef = await prisma.customerReference.findFirst({
          where: { phone: normalizedPhone },
        });

        await voiceService.updateSession(callSid, {
          stage: VoiceStage.AWAITING_DOB,
          phoneNumber: normalizedPhone,
          customerReferenceId: custRef ? custRef.id : null,
          authenticationAttempts: session.authenticationAttempts + 1,
        });

        const gather = twiml.gather({
          input: ["dtmf"],
          action: "/api/voice-auth",
          numDigits: 8,
          timeout: 5,
        });
        gather.say(
          { voice: "Polly.Joanna" },
          "Now, please enter your date of birth, in two-digit month, two-digit day, and four-digit year format.",
        );
      }
      break;
    }
    case VoiceStage.AWAITING_DOB: {
      if (!input || input.length < 8) {
        twiml.say({ voice: "Polly.Joanna" }, "Invalid date of birth.");
        twiml.redirect("/api/voice-auth");
        await voiceService.updateSession(callSid, {
          authenticationAttempts: session.authenticationAttempts + 1,
        });
      } else {
        // Validate DOB against User
        let verified = false;
        if (session.customerReferenceId) {
          const custRef = await prisma.customerReference.findUnique({
            where: { id: session.customerReferenceId },
          });
          if (custRef && custRef.userId) {
            const user = await userRepo.findById(custRef.userId);
            if (user && user.birthDate) {
              const formattedDOB = `${input.substring(4, 8)}-${input.substring(0, 2)}-${input.substring(2, 4)}`;
              if (user.birthDate === formattedDOB) verified = true;
            }
          }
        }

        // Allow mock bypass if no real user/DB matches but test environment
        if (
          process.env.USE_MOCK_TEST_DEVICE === "true" &&
          input === "01011990"
        ) {
          verified = true;
        }

        if (verified) {
          await voiceService.updateSession(callSid, {
            stage: VoiceStage.AWAITING_TEST_CHOICE,
            authenticationAttempts: 0,
          });
          const gather = twiml.gather({
            input: ["dtmf"],
            action: "/api/voice-auth",
            numDigits: 1,
            timeout: 5,
          });
          gather.say(
            { voice: "Polly.Joanna" },
            "Thank you. Your account is verified. Press 1 to start a balance test. Press 2 to hang up. Press 3 to record a manual test.",
          );
        } else {
          await voiceService.updateSession(callSid, {
            authenticationAttempts: session.authenticationAttempts + 1,
            stage: VoiceStage.AWAITING_PHONE,
          });
          twiml.say(
            { voice: "Polly.Joanna" },
            "We could not verify that date of birth.",
          );
          twiml.redirect("/api/voice-auth");
        }
      }
      break;
    }
    case VoiceStage.AWAITING_TEST_CHOICE: {
      if (input === "1") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.TEST_IN_PROGRESS,
          testStartedAt: new Date(),
        });
        twiml.say(
          { voice: "Polly.Joanna" },
          "Starting test. Please follow the instructions...",
        );
        // Mocking test ending
        twiml.redirect("/api/voice-auth");
      } else if (input === "2") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.COMPLETED,
        });
        twiml.say({ voice: "Polly.Joanna" }, "Goodbye.");
        twiml.hangup();
      } else if (input === "3") {
        // Save VoiceTest
        let userId = null;
        if (session.customerReferenceId) {
          const ref = await prisma.customerReference.findUnique({
            where: { id: session.customerReferenceId },
          });
          userId = ref?.userId || null;
        }

        await voiceService.recordTest(
          callSid,
          userId,
          "customer@example.com",
          "COMPLETED",
          { score: 85 },
        );

        await voiceService.updateSession(callSid, {
          stage: VoiceStage.COMPLETED,
          testCompletedAt: new Date(),
        });
        twiml.say({ voice: "Polly.Joanna" }, "Test recorded. Goodbye.");
        twiml.hangup();
      } else {
        const gather = twiml.gather({
          input: ["dtmf"],
          action: "/api/voice-auth",
          numDigits: 1,
          timeout: 5,
        });
        gather.say(
          { voice: "Polly.Joanna" },
          "Invalid choice. Press 1 to start a balance test. Press 2 to hang up. Press 3 to record a manual test.",
        );
      }
      break;
    }
    case VoiceStage.TEST_IN_PROGRESS: {
      // Automatic completion after instructions
      let userId = null;
      if (session.customerReferenceId) {
        const ref = await prisma.customerReference.findUnique({
          where: { id: session.customerReferenceId },
        });
        userId = ref?.userId || null;
      }
      await voiceService.recordTest(
        callSid,
        userId,
        "customer@example.com",
        "COMPLETED",
        { score: 90 },
      );
      await voiceService.updateSession(callSid, {
        stage: VoiceStage.COMPLETED,
        testCompletedAt: new Date(),
      });
      twiml.say({ voice: "Polly.Joanna" }, "Test complete. Goodbye.");
      twiml.hangup();
      break;
    }
    default:
      twiml.say({ voice: "Polly.Joanna" }, "An error occurred. Goodbye.");
      twiml.hangup();
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
