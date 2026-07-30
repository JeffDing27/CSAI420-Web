import { Device } from '@prisma/client';
import { DeviceService } from '../services/device.service';

export type DeviceAuthResult = 
  | { type: 'authenticated'; device: Device }
  | { type: 'none' }
  | { type: 'error'; status: number; message: string };

export async function authenticateDeviceRequest(request: Request): Promise<DeviceAuthResult> {
  const deviceIdHeader = request.headers.get('x-stedi-device-id');
  const deviceTokenHeader = request.headers.get('x-stedi-device-token');

  if (!deviceIdHeader && !deviceTokenHeader) {
    return { type: 'none' };
  }

  if (!deviceIdHeader || !deviceTokenHeader) {
    return { type: 'error', status: 401, message: 'Incomplete device credentials' };
  }

  try {
    const device = await DeviceService.authenticateDevice({
      deviceId: deviceIdHeader,
      deviceToken: deviceTokenHeader
    });
    return { type: 'authenticated', device };
  } catch (error: any) {
    if (error.message === 'Invalid deviceId format' || error.message === 'Device ID cannot be empty') {
      return { type: 'error', status: 400, message: 'Malformed device ID' };
    }
    if (error.message === 'Invalid device credentials' || error.message === 'Device not found') {
      return { type: 'error', status: 401, message: 'Invalid device credentials' };
    }
    if (error.message === 'Device is retired') {
      return { type: 'error', status: 409, message: 'Device is retired' };
    }
    throw error;
  }
}
