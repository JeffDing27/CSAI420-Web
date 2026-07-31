import { NextResponse } from "next/server";
import { VoiceService } from "@/services/voice.service";

const voiceService = new VoiceService();

type SensorPayload = {
  callSid?: string;
  CallSid?: string;
  event?: "connected" | "step";
  steps?: number;
};

function authorized(request: Request): boolean {
  const expected = process.env.IVR_SENSOR_WEBHOOK_SECRET;
  if (!expected) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-ivr-sensor-secret") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: SensorPayload;
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      payload = (await request.json()) as SensorPayload;
    } else {
      const params = new URLSearchParams(await request.text());
      payload = {
        callSid: params.get("callSid") ?? undefined,
        CallSid: params.get("CallSid") ?? undefined,
        event: (params.get("event") as SensorPayload["event"]) ?? undefined,
        steps: params.has("steps") ? Number(params.get("steps")) : undefined,
      };
    }
  } catch {
    return new NextResponse("Invalid sensor payload", { status: 400 });
  }

  const callSid = payload.callSid ?? payload.CallSid;
  if (!callSid) {
    return new NextResponse("Missing callSid", { status: 400 });
  }

  const requestedSteps =
    payload.event === "connected" ? 0 : (payload.steps ?? 1);
  if (
    !Number.isInteger(requestedSteps) ||
    requestedSteps < 0 ||
    requestedSteps > 30
  ) {
    return new NextResponse("steps must be an integer from 0 through 30", {
      status: 400,
    });
  }

  const session = await voiceService.recordSensorUpdate(
    callSid,
    requestedSteps,
  );
  if (!session) {
    return new NextResponse("Voice session not found", { status: 404 });
  }

  return NextResponse.json({
    accepted: true,
    stage: session.stage,
    setOneSteps: Math.min(session.setOneSteps, 30),
    setTwoSteps: Math.min(session.setTwoSteps, 30),
  });
}
