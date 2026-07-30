import { NextResponse } from 'next/server';
import { getAuthToken } from '../../../../utils/auth';
import { AuthService } from '../../../../lib/service/auth.service';
import { DeviceService } from '../../../../services/device.service';

export async function POST(request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await AuthService.validateSession(token);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await params;
    if (!deviceId) {
      return NextResponse.json({ error: 'Invalid device ID' }, { status: 400 });
    }

    try {
      const result = await DeviceService.unassignDevice({
        deviceId,
        userId: session.userId
      });

      return NextResponse.json({
        deviceId: result.device.deviceId,
        status: result.device.status,
        unassignedAt: result.assignment.unassignedAt
      }, { status: 200 });
    } catch (e: any) {
      if (e.message === 'Invalid deviceId format' || e.message === 'Device ID cannot be empty') {
        return NextResponse.json({ error: 'Invalid device ID' }, { status: 400 });
      }
      if (e.message === 'Device not found') {
        return NextResponse.json({ error: e.message }, { status: 404 });
      }
      if (e.message === 'Device is not assigned to this user') {
        return NextResponse.json({ error: e.message }, { status: 403 });
      }
      if (e.message === 'Device is not currently assigned') {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
