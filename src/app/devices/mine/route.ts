import { NextResponse } from 'next/server';
import { StediAuthService } from '../../../lib/service/stedi-auth.service';
import { DeviceService } from '../../../services/device.service';

export async function GET(request: Request) {
  try {
    const authResult = await StediAuthService.resolveAuthenticatedProfile(request);

    if (authResult.error || !authResult.profile) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
    }

    const activeAssignments = await DeviceService.getActiveAssignmentsForProfile(authResult.profile.id);

    const devices = activeAssignments.map((assignment) => ({
      deviceId: assignment.device.deviceId,
      status: assignment.device.status,
      lastSeenAt: assignment.device.lastSeenAt,
      assignment: {
        id: assignment.id,
        method: assignment.method,
        assignedAt: assignment.assignedAt
      }
    }));

    return NextResponse.json({ devices }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
