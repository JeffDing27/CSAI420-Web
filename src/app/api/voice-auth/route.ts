import { VoiceStage } from "@prisma/client";
import { NextResponse } from "next/server";
import twilio from "twilio";
import { VoiceService } from "@/services/voice.service";

const { VoiceResponse } = twilio.twiml;
const voiceService = new VoiceService();
const IVR_PATH = "/api/voice-auth";
const VOICE = "Polly.Joanna";
type Twiml = InstanceType<typeof VoiceResponse>;

function response(twiml: Twiml, status = 200): NextResponse {
  return new NextResponse(twiml.toString(), {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

function gatherName(twiml: Twiml, prompt: string): void {
  const gather = twiml.gather({
    input: ["speech"],
    action: IVR_PATH,
    timeout: 5,
    speechTimeout: "auto",
  });
  gather.say({ voice: VOICE }, prompt);
  twiml.redirect(IVR_PATH);
}

function gatherChoice(twiml: Twiml, prompt: string, numDigits = 1): void {
  const gather = twiml.gather({
    input: ["dtmf"],
    action: IVR_PATH,
    numDigits,
    timeout: 7,
  });
  gather.say({ voice: VOICE }, prompt);
  twiml.redirect(IVR_PATH);
}

function pollForControl(twiml: Twiml): void {
  twiml.gather({
    input: ["dtmf"],
    action: IVR_PATH,
    numDigits: 1,
    timeout: 5,
  });
  twiml.redirect(IVR_PATH);
}

function restSeconds(): number {
  const configured = Number(process.env.IVR_REST_SECONDS ?? "180");
  return Number.isFinite(configured) && configured >= 0 ? configured : 180;
}

function validSignature(request: Request, params: URLSearchParams): boolean {
  if (process.env.IVR_VALIDATE_TWILIO_SIGNATURE !== "true") return true;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;
  const url = process.env.TWILIO_WEBHOOK_URL ?? request.url;
  return twilio.validateRequest(
    authToken,
    signature,
    url,
    Object.fromEntries(params),
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  if (!validSignature(request, params)) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  const callSid = params.get("CallSid") || "test_sid";
  const digits = params.get("Digits")?.trim() ?? "";
  const speech = params.get("SpeechResult")?.trim() ?? "";
  let session = await voiceService.getSession(callSid);

  if (session && session.expiresAt < new Date()) {
    await voiceService.updateSession(callSid, {
      stage: VoiceStage.FAILED,
      callStatus: "expired",
    });
    session = null;
  }
  session ??= await voiceService.startSession(callSid);

  const twiml = new VoiceResponse();
  if (session.authenticationAttempts >= 3) {
    await voiceService.updateSession(callSid, {
      stage: VoiceStage.FAILED,
      callStatus: "authentication-failed",
    });
    twiml.say(
      { voice: VOICE },
      "We could not verify your information. Please try again later. Goodbye.",
    );
    twiml.hangup();
    return response(twiml);
  }

  switch (session.stage) {
    case VoiceStage.INITIAL:
    case VoiceStage.AWAITING_NAME:
    case VoiceStage.AWAITING_PHONE: {
      if (!speech) {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.AWAITING_NAME,
        });
        gatherName(
          twiml,
          "Welcome to the STEDI Mobility Coach. Please clearly say your first and last name.",
        );
        break;
      }

      await voiceService.updateSession(callSid, {
        stage: VoiceStage.AWAITING_NAME_CONFIRMATION,
        patientName: speech,
      });
      gatherChoice(
        twiml,
        `I heard ${speech}. Press 1 if that is correct, or press 2 to say your name again.`,
      );
      break;
    }

    case VoiceStage.AWAITING_NAME_CONFIRMATION: {
      if (digits === "2") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.AWAITING_NAME,
          patientName: null,
        });
        gatherName(twiml, "Please say your first and last name again.");
      } else if (digits === "1") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.AWAITING_DOB,
        });
        gatherChoice(
          twiml,
          "Using the keypad, enter your date of birth as two digits for the month, two digits for the day, and four digits for the year.",
          8,
        );
      } else {
        gatherChoice(
          twiml,
          `Press 1 to confirm ${session.patientName ?? "that name"}, or press 2 to try again.`,
        );
      }
      break;
    }

    case VoiceStage.AUTHENTICATING:
    case VoiceStage.AWAITING_DOB: {
      if (!digits) {
        gatherChoice(
          twiml,
          "Enter your eight-digit date of birth using the keypad.",
          8,
        );
        break;
      }

      const patient = session.patientName
        ? await voiceService.authenticatePatient(session.patientName, digits)
        : null;
      if (!patient) {
        const attempts = session.authenticationAttempts + 1;
        await voiceService.updateSession(callSid, {
          stage: attempts >= 3 ? VoiceStage.FAILED : VoiceStage.AWAITING_NAME,
          patientName: null,
          authenticationAttempts: attempts,
          ...(attempts >= 3 ? { callStatus: "authentication-failed" } : {}),
        });
        if (attempts >= 3) {
          twiml.say(
            { voice: VOICE },
            "We could not verify your information. Please try again later. Goodbye.",
          );
          twiml.hangup();
        } else {
          gatherName(
            twiml,
            "We could not verify those details. Please say your first and last name again.",
          );
        }
        break;
      }

      await voiceService.updateSession(callSid, {
        stage: VoiceStage.SAFETY_CHECK,
        userId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientEmail: patient.email,
        phoneNumber: patient.phone,
        authenticationAttempts: 0,
      });
      gatherChoice(
        twiml,
        "Your identity is verified. Before exercising, clear the area, wear stable footwear, and make sure you feel steady enough to continue. Do not look into the device lasers, and keep children away. Stop if you feel pain, weak, or dizzy. Press 1 if you are ready, press 2 to repeat this safety message, or press 0 to stop.",
      );
      break;
    }

    case VoiceStage.AWAITING_TEST_CHOICE:
    case VoiceStage.SAFETY_CHECK: {
      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "stopped-by-caller",
        });
        twiml.say({ voice: VOICE }, "The exercise has been stopped. Goodbye.");
        twiml.hangup();
      } else if (digits === "1") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.DEVICE_CHECK,
        });
        gatherChoice(
          twiml,
          "Plug the STEDI device into the bottom receptacle. Confirm it was made for this outlet height and that the green starting line runs straight across your toes. We are checking for sensor data. Press 1 if the device indicates it is ready, press 2 to repeat setup, or press 0 to stop.",
        );
      } else {
        gatherChoice(
          twiml,
          "Clear the area and do not look into the lasers. Press 1 when you feel safe and ready, press 2 to repeat, or press 0 to stop.",
        );
      }
      break;
    }

    case VoiceStage.DEVICE_CHECK: {
      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "device-not-ready",
        });
        twiml.say({ voice: VOICE }, "No test was started. Goodbye.");
        twiml.hangup();
      } else if (session.deviceConnected || digits === "1") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.AWAITING_DOMINANT_FOOT,
          deviceConnected: true,
        });
        gatherChoice(
          twiml,
          "The device is ready. Think of the foot you would use to kick a ball. Press 1 for your left foot, press 2 for your right foot, or press 0 to stop.",
        );
      } else {
        gatherChoice(
          twiml,
          "We have not detected the device yet. Check that it is powered and correctly positioned. Press 1 if its ready indicator is on, press 2 to repeat setup, or press 0 to stop.",
        );
      }
      break;
    }

    case VoiceStage.AWAITING_DOMINANT_FOOT: {
      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "stopped-by-caller",
        });
        twiml.say({ voice: VOICE }, "The exercise has been stopped. Goodbye.");
        twiml.hangup();
      } else if (digits === "1" || digits === "2") {
        const dominantFoot = digits === "1" ? "left" : "right";
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.READY_FOR_SET_ONE,
          dominantFoot,
        });
        gatherChoice(
          twiml,
          `Stand with your toes at the green line and fold your arms. Step toward the red target with your ${dominantFoot} foot and return behind the line. You will do 30 steps as quickly as you safely can. Press 1 to start, press 2 to repeat, or press 0 to stop.`,
        );
      } else {
        gatherChoice(
          twiml,
          "Press 1 if your left foot is dominant, press 2 if your right foot is dominant, or press 0 to stop.",
        );
      }
      break;
    }

    case VoiceStage.TEST_IN_PROGRESS:
    case VoiceStage.READY_FOR_SET_ONE: {
      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "stopped-by-caller",
        });
        twiml.say({ voice: VOICE }, "The exercise has been stopped. Goodbye.");
        twiml.hangup();
      } else if (digits === "1") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.SET_ONE_IN_PROGRESS,
          setOneSteps: 0,
          lastAnnouncedStep: 0,
          testStartedAt: new Date(),
        });
        twiml.say(
          { voice: VOICE },
          "Set one has started. Complete 30 safe steps. Press 1 to repeat instructions, 2 to pause, 3 to restart this set, or 0 to stop.",
        );
        pollForControl(twiml);
      } else {
        gatherChoice(
          twiml,
          `Stand at the green line with your arms folded. Step toward the target using your ${session.dominantFoot ?? "dominant"} foot and return. Press 1 to start, press 2 to repeat, or press 0 to stop.`,
        );
      }
      break;
    }

    case VoiceStage.SET_ONE_IN_PROGRESS:
    case VoiceStage.SET_TWO_IN_PROGRESS: {
      const isSetOne = session.stage === VoiceStage.SET_ONE_IN_PROGRESS;
      const setNumber = isSetOne ? 1 : 2;
      const steps = isSetOne ? session.setOneSteps : session.setTwoSteps;

      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "stopped-by-caller",
        });
        twiml.say({ voice: VOICE }, "The exercise has been stopped. Goodbye.");
        twiml.hangup();
        break;
      }
      if (digits === "2") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.PAUSED,
          pausedStage: session.stage,
        });
        gatherChoice(
          twiml,
          "The exercise is paused. Press 1 to resume, press 3 to restart this set, or press 0 to stop.",
        );
        break;
      }
      if (digits === "3") {
        await voiceService.updateSession(callSid, {
          ...(isSetOne ? { setOneSteps: 0 } : { setTwoSteps: 0 }),
          lastAnnouncedStep: 0,
        });
        twiml.say(
          { voice: VOICE },
          `Set ${setNumber} is restarting. Begin when you are ready.`,
        );
        pollForControl(twiml);
        break;
      }
      if (digits === "1") {
        twiml.say(
          { voice: VOICE },
          `Continue stepping toward the red target with your ${session.dominantFoot ?? "dominant"} foot and return behind the green line. You have completed ${Math.min(steps, 30)} of 30 steps.`,
        );
      }

      if (steps >= 30) {
        if (isSetOne) {
          await voiceService.updateSession(callSid, {
            stage: VoiceStage.RESTING,
            setOneSteps: 30,
            restStartedAt: new Date(),
            lastAnnouncedStep: 0,
          });
          twiml.say(
            { voice: VOICE },
            "Set one is complete. Rest for three minutes before the second set. Press 1 to hear the remaining rest time, or press 0 to stop.",
          );
          pollForControl(twiml);
        } else {
          await voiceService.updateSession(callSid, {
            stage: VoiceStage.SCORING,
            setTwoSteps: 30,
            testCompletedAt: new Date(),
          });
          twiml.say(
            { voice: VOICE },
            "Set two is complete. Please wait while we calculate your score.",
          );
          twiml.redirect(IVR_PATH);
        }
        break;
      }

      const milestone = Math.floor(steps / 5) * 5;
      if (milestone >= 5 && milestone > session.lastAnnouncedStep) {
        await voiceService.updateSession(callSid, {
          lastAnnouncedStep: milestone,
        });
        twiml.say(
          { voice: VOICE },
          `${milestone} of 30 steps complete. Continue at a safe pace.`,
        );
      }
      pollForControl(twiml);
      break;
    }

    case VoiceStage.RESTING: {
      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "stopped-by-caller",
        });
        twiml.say({ voice: VOICE }, "The exercise has been stopped. Goodbye.");
        twiml.hangup();
        break;
      }

      const startedAt = session.restStartedAt?.getTime() ?? Date.now();
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, restSeconds() - elapsedSeconds);
      if (remaining === 0) {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.READY_FOR_SET_TWO,
          lastAnnouncedStep: 0,
        });
        gatherChoice(
          twiml,
          "Your rest is complete. Return your toes to the green line and fold your arms. Press 1 to start the second set, press 2 to repeat, or press 0 to stop.",
        );
      } else {
        if (digits === "1") {
          const minutes = Math.floor(remaining / 60);
          const seconds = remaining % 60;
          twiml.say(
            { voice: VOICE },
            `${minutes} minutes and ${seconds} seconds remain in your rest.`,
          );
        }
        pollForControl(twiml);
      }
      break;
    }

    case VoiceStage.READY_FOR_SET_TWO: {
      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "stopped-by-caller",
        });
        twiml.say({ voice: VOICE }, "The exercise has been stopped. Goodbye.");
        twiml.hangup();
      } else if (digits === "1") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.SET_TWO_IN_PROGRESS,
          setTwoSteps: 0,
          lastAnnouncedStep: 0,
        });
        twiml.say(
          { voice: VOICE },
          "Set two has started. Complete 30 more safe steps. Press 1 to repeat instructions, 2 to pause, 3 to restart this set, or 0 to stop.",
        );
        pollForControl(twiml);
      } else {
        gatherChoice(
          twiml,
          "Return to the green line with your arms folded. Press 1 to start the second set, press 2 to repeat, or press 0 to stop.",
        );
      }
      break;
    }

    case VoiceStage.PAUSED: {
      if (digits === "0") {
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "stopped-by-caller",
        });
        twiml.say({ voice: VOICE }, "The exercise has been stopped. Goodbye.");
        twiml.hangup();
        break;
      }

      const resumeStage =
        session.pausedStage === VoiceStage.SET_TWO_IN_PROGRESS
          ? VoiceStage.SET_TWO_IN_PROGRESS
          : VoiceStage.SET_ONE_IN_PROGRESS;
      if (digits === "1" || digits === "3") {
        await voiceService.updateSession(callSid, {
          stage: resumeStage,
          pausedStage: null,
          ...(digits === "3" && resumeStage === VoiceStage.SET_ONE_IN_PROGRESS
            ? { setOneSteps: 0, lastAnnouncedStep: 0 }
            : {}),
          ...(digits === "3" && resumeStage === VoiceStage.SET_TWO_IN_PROGRESS
            ? { setTwoSteps: 0, lastAnnouncedStep: 0 }
            : {}),
        });
        twiml.say(
          { voice: VOICE },
          digits === "3"
            ? "The current set is restarting now."
            : "The exercise is resuming now.",
        );
        pollForControl(twiml);
      } else {
        gatherChoice(
          twiml,
          "The exercise is paused. Press 1 to resume, press 3 to restart this set, or press 0 to stop.",
        );
      }
      break;
    }

    case VoiceStage.SCORING: {
      try {
        const score = await voiceService.completeTest(session);
        const spokenScore = Number.isInteger(score)
          ? String(score)
          : score.toFixed(1);
        twiml.say(
          { voice: VOICE },
          `Your STEDI balance score is ${spokenScore}. This score is not a diagnosis. Please discuss questions about your result with your care team. Unplug the device and store it safely away from children. Thank you for using STEDI. Goodbye.`,
        );
      } catch (error) {
        console.error("IVR scoring failed", {
          callSid,
          error: error instanceof Error ? error.message : "unknown error",
        });
        await voiceService.updateSession(callSid, {
          stage: VoiceStage.FAILED,
          callStatus: "scoring-failed",
        });
        twiml.say(
          { voice: VOICE },
          "We saved your exercise but could not calculate the score right now. Please try again later. Goodbye.",
        );
      }
      twiml.hangup();
      break;
    }

    case VoiceStage.COMPLETED:
      twiml.say(
        { voice: VOICE },
        session.score === null
          ? "This exercise is already complete. Goodbye."
          : `This exercise is already complete. Your score was ${session.score}. Goodbye.`,
      );
      twiml.hangup();
      break;

    case VoiceStage.FAILED:
      twiml.say(
        { voice: VOICE },
        "This session has ended. Please call again when you are ready.",
      );
      twiml.hangup();
      break;

    default:
      twiml.say({ voice: VOICE }, "An error occurred. Please try again later.");
      twiml.hangup();
  }

  return response(twiml);
}
