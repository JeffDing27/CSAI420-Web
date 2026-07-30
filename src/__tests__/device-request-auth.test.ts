import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { authenticateDeviceRequest } from '../utils/device-request-auth';
import { DeviceService } from '../services/device.service';
import { DeviceStatus } from '@prisma/client';

vi.mock('../services/device.service', () => ({
  DeviceService: {
    authenticateDevice: vi.fn(),
  }
}));

function createRequest(headers: Record<string, string>) {
  const reqHeaders = new Headers();
  for (const [k, v] of Object.entries(headers)) {
    reqHeaders.set(k, v);
  }
  return new Request('http://localhost', { headers: reqHeaders });
}

describe('device-request-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns none when neither header is present', async () => {
    const req = createRequest({});
    const res = await authenticateDeviceRequest(req);
    expect(res).toEqual({ type: 'none' });
  });

  it('returns 401 when only device ID is present', async () => {
    const req = createRequest({ 'x-stedi-device-id': 'DEV-1' });
    const res = await authenticateDeviceRequest(req);
    expect(res).toEqual({ type: 'error', status: 401, message: 'Incomplete device credentials' });
  });

  it('returns 401 when only device token is present', async () => {
    const req = createRequest({ 'x-stedi-device-token': 'token1' });
    const res = await authenticateDeviceRequest(req);
    expect(res).toEqual({ type: 'error', status: 401, message: 'Incomplete device credentials' });
  });

  it('returns 400 for malformed device ID', async () => {
    (DeviceService.authenticateDevice as any).mockRejectedValue(new Error('Invalid deviceId format'));
    const req = createRequest({ 'x-stedi-device-id': '!', 'x-stedi-device-token': 'token1' });
    const res = await authenticateDeviceRequest(req);
    expect(res).toEqual({ type: 'error', status: 400, message: 'Malformed device ID' });
  });

  it('returns 401 for invalid credentials', async () => {
    (DeviceService.authenticateDevice as any).mockRejectedValue(new Error('Invalid device credentials'));
    const req = createRequest({ 'x-stedi-device-id': 'DEV-1', 'x-stedi-device-token': 'token1' });
    const res = await authenticateDeviceRequest(req);
    expect(res).toEqual({ type: 'error', status: 401, message: 'Invalid device credentials' });
  });

  it('returns 409 for retired devices', async () => {
    (DeviceService.authenticateDevice as any).mockRejectedValue(new Error('Device is retired'));
    const req = createRequest({ 'x-stedi-device-id': 'DEV-1', 'x-stedi-device-token': 'token1' });
    const res = await authenticateDeviceRequest(req);
    expect(res).toEqual({ type: 'error', status: 409, message: 'Device is retired' });
  });

  it('returns authenticated device when credentials are valid', async () => {
    const mockDevice = { id: 'd1', deviceId: 'DEV-1', status: DeviceStatus.ASSIGNED };
    (DeviceService.authenticateDevice as any).mockResolvedValue(mockDevice);

    const req = createRequest({ 'x-stedi-device-id': 'DEV-1', 'x-stedi-device-token': 'token1' });
    const res = await authenticateDeviceRequest(req);

    expect(res).toEqual({ type: 'authenticated', device: mockDevice });
    expect(DeviceService.authenticateDevice).toHaveBeenCalledWith({
      deviceId: 'DEV-1',
      deviceToken: 'token1'
    });
  });
});
