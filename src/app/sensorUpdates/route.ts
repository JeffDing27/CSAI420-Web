import { recordHeartbeat as storeRecordHeartbeat } from "@/utils/device-status-store";
import { authenticateDeviceRequest } from "@/utils/device-request-auth";
import { DeviceService } from "@/services/device.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await authenticateDeviceRequest(request);

  if (authResult.type === 'error') {
    return new Response(authResult.message, { status: authResult.status });
  }

  if (authResult.type === 'none') {
    return new Response('Incomplete device credentials', { status: 401 });
  }

  const { device } = authResult;

  let data: {
    deviceId?: string;
    poweredOn?: boolean;
    recordedAt?: number;
    customer?: string;
  };

  try {
    data = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (data.deviceId !== undefined && data.deviceId !== device.deviceId) {
    return new Response("Device ID mismatch", { status: 400 });
  }

  const serverReceiptTime = new Date();

  try {
    await DeviceService.recordHeartbeat({
      deviceRecordId: device.id,
      receivedAt: serverReceiptTime
    });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }

  // Update legacy device status store
  await storeRecordHeartbeat({
    deviceId: device.deviceId,
    customer: null, // do not trust body.customer
    poweredOn: data.poweredOn ?? true,
    recordedAt: data.recordedAt && typeof data.recordedAt === 'number' && !isNaN(data.recordedAt) 
      ? data.recordedAt 
      : serverReceiptTime.getTime(),
  });

  return new Response("Saved", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
