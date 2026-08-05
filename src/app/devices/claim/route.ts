import { NextResponse } from 'next/server';
import { getAuthToken } from '../../../utils/auth';
import { AuthService } from '../../../lib/service/auth.service';
import { DeviceService } from '../../../services/device.service';
import { DeviceAssignmentMethod } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await AuthService.validateSession(token);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { claimCode } = body;
    if (!claimCode || typeof claimCode !== 'string' || !/^\d{6}$/.test(claimCode)) {
      return NextResponse.json({ error: 'Invalid claim code' }, { status: 400 });
    }

    try {
      const result = await DeviceService.claimDevice({
        userId: session.userId,
        claimCode,
        method: DeviceAssignmentMethod.MOBILE
      });

      return NextResponse.json({
        deviceId: result.device.deviceId,
        status: result.device.status,
        assignment: {
          id: result.assignment.id,
          method: result.assignment.method,
          assignedAt: result.assignment.assignedAt
        }
      }, { status: result.isNew ? 201 : 200 });
    } catch (e: any) {
      if (e.message === 'Invalid claim code') {
        return NextResponse.json({ error: e.message }, { status: 404 });
      }
      if (e.message === 'Device is already assigned to another patient' || e.message === 'Device is retired') {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
