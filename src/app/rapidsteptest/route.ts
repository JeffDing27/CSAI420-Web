import { forwardRequest } from "@/utils/pass-through";
import { authenticateDeviceRequest } from "@/utils/device-request-auth";
import { DeviceService } from "@/services/device.service";
import { RapidStepTestService } from "@/services/rapid-step-test.service";
import { TestSource } from "@prisma/client";

export async function POST(request: Request) {
  const deviceIdHeader = request.headers.get('x-stedi-device-id');
  const deviceTokenHeader = request.headers.get('x-stedi-device-token');

  if (!deviceIdHeader && !deviceTokenHeader) {
    // Mode A: legacy request
    return forwardRequest(request, "/rapidsteptest");
  }

  // Mode B: authenticated device request
  const authResult = await authenticateDeviceRequest(request);

  if (authResult.type === 'error') {
    return new Response(authResult.message, { status: authResult.status });
  }
  
  if (authResult.type === 'none') {
    return new Response('Incomplete device credentials', { status: 401 });
  }

  const { device } = authResult;

  let data: any;
  try {
    data = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (data.deviceId !== undefined && data.deviceId !== device.deviceId) {
    return new Response("Device ID mismatch", { status: 400 });
  }

  try {
    const activeAssignment = await DeviceService.getActiveAssignment(device.id);
    if (!activeAssignment) {
      return new Response("Device has no active patient assignment", { status: 409 });
    }

    const externalTestId = data.testId || data.id || undefined;
    const completedAt = new Date(); // server time

    const service = new RapidStepTestService();
    await service.submitTest({
      userId: activeAssignment.userId,
      deviceRecordId: device.id,
      source: TestSource.DEVICE,
      externalTestId,
      testData: data,
      completedAt,
    });

    return new Response("Saved", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  } catch (error: any) {
    // Handle specific RapidStepTestService idempotency error if necessary
    // or unexpected errors
    return new Response("Internal Server Error", { status: 500 });
  }
}
