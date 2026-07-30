import { recordHeartbeat } from "@/utils/device-status-store";

export async function POST(request: Request) {
  let data: {
    deviceId?: string;
    customer?: string | null;
    poweredOn?: boolean;
    recordedAt?: number;
  };

  try {
    data = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!data.deviceId || typeof data.deviceId !== "string") {
    return new Response("Missing deviceId", { status: 400 });
  }

  await recordHeartbeat({
    deviceId: data.deviceId,
    customer: data.customer ?? null,
    poweredOn: data.poweredOn ?? true,
    recordedAt: data.recordedAt,
  });

  return new Response("Saved", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
