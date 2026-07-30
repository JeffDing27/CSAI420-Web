import { NextResponse } from 'next/server';
import { getAuthToken } from '../../../utils/auth';
import { AuthService } from '../../../lib/service/auth.service';
import { DeviceService } from '../../../services/device.service';

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await AuthService.validateSession(token);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeAssignments = await DeviceService.getActiveAssignmentsForUser(session.userId);

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
