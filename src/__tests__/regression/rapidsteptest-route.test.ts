import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/rapidsteptest/route';
import { DeviceService } from '@/services/device.service';
import { RapidStepTestService } from '@/services/rapid-step-test.service';
import { forwardRequest } from '@/utils/pass-through';
import { DeviceStatus } from '@prisma/client';

vi.mock('@/services/device.service', () => ({
  DeviceService: {
    authenticateDevice: vi.fn(),
    getActiveAssignment: vi.fn(),
  }
}));

vi.mock('@/services/rapid-step-test.service', () => {
  const RapidStepTestService = vi.fn();
  RapidStepTestService.prototype.submitTest = vi.fn();
  return { RapidStepTestService };
});

vi.mock('@/utils/pass-through', () => ({
  forwardRequest: vi.fn(),
}));

describe('rapidsteptest route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(headers: Record<string, string>, body?: any) {
    const reqHeaders = new Headers();
    for (const [k, v] of Object.entries(headers)) {
      reqHeaders.set(k, v);
    }
    return new Request('http://localhost/rapidsteptest', {
      method: 'POST',
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('legacy request calls forwardRequest unchanged', async () => {
    (forwardRequest as any).mockResolvedValue(new Response('legacy ok'));
    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(forwardRequest).toHaveBeenCalled();
  });

  it('authenticated assigned device stores under assignment.userId', async () => {
    (DeviceService.authenticateDevice as any).mockResolvedValue({
      id: 'd1', deviceId: 'DEV-1', status: DeviceStatus.ASSIGNED
    });
    (DeviceService.getActiveAssignment as any).mockResolvedValue({
      userId: 'u1'
    });
    
    const mockSubmitTest = vi.fn();
    RapidStepTestService.prototype.submitTest = mockSubmitTest;

    const payload = { deviceId: 'DEV-1', customer: 'hacker@test.com', testId: 'ext-1' };
    const req = createRequest({
      'x-stedi-device-id': 'DEV-1',
      'x-stedi-device-token': 'token1'
    }, payload);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Saved');
    expect(mockSubmitTest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      deviceRecordId: 'd1',
      source: 'DEVICE',
      externalTestId: 'ext-1',
      testData: payload,
    }));
  });

  it('unassigned device rejected with 409', async () => {
    (DeviceService.authenticateDevice as any).mockResolvedValue({
      id: 'd1', deviceId: 'DEV-1', status: DeviceStatus.UNASSIGNED
    });
    (DeviceService.getActiveAssignment as any).mockResolvedValue(null);
    
    const req = createRequest({
      'x-stedi-device-id': 'DEV-1',
      'x-stedi-device-token': 'token1'
    }, {});
    
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('malformed payload rejected with 400', async () => {
    (DeviceService.authenticateDevice as any).mockResolvedValue({
      id: 'd1', deviceId: 'DEV-1'
    });
    
    const req = new Request('http://localhost/rapidsteptest', {
      method: 'POST',
      headers: new Headers({
        'x-stedi-device-id': 'DEV-1',
        'x-stedi-device-token': 'token1'
      }),
      body: '{"bad json'
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('invalid token rejected with 401', async () => {
    (DeviceService.authenticateDevice as any).mockRejectedValue(new Error('Invalid device credentials'));
    const req = createRequest({
      'x-stedi-device-id': 'DEV-1',
      'x-stedi-device-token': 'bad'
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('body/header mismatch rejected with 400', async () => {
    (DeviceService.authenticateDevice as any).mockResolvedValue({
      id: 'd1', deviceId: 'DEV-1'
    });
    const req = createRequest({
      'x-stedi-device-id': 'DEV-1',
      'x-stedi-device-token': 'token'
    }, { deviceId: 'HACKER-DEV' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
