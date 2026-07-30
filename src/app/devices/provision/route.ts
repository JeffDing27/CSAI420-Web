import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { DeviceService } from '../../../services/device.service';

export async function POST(request: Request) {
  try {
    const serverKey = process.env.DEVICE_PROVISIONING_KEY;
    if (!serverKey) {
      return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
    }

    const providedKey = request.headers.get('x-device-provisioning-key');
    if (!providedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serverKeyBuf = Buffer.from(serverKey);
    const providedKeyBuf = Buffer.from(providedKey);

    if (serverKeyBuf.length !== providedKeyBuf.length || !crypto.timingSafeEqual(serverKeyBuf, providedKeyBuf)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { deviceId } = body;
    if (deviceId === undefined) {
      return NextResponse.json({ error: 'Invalid deviceId' }, { status: 400 });
    }

    try {
      const result = await DeviceService.provisionDevice({ deviceId });
      
      return NextResponse.json({
        device: {
          id: result.device.id,
          deviceId: result.device.deviceId,
          status: result.device.status
        },
        claimCode: result.claimCode,
        deviceToken: result.deviceToken
      }, { status: 201 });
    } catch (e: any) {
      if (e.message === 'Invalid deviceId format' || e.message === 'Device ID cannot be empty') {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      if (e.message === 'Device already provisioned') {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
