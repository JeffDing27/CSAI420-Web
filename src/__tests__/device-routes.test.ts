import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { POST as provisionPOST } from '../app/devices/provision/route';
import { POST as claimPOST } from '../app/devices/claim/route';
import { POST as unassignPOST } from '../app/devices/[deviceId]/unassign/route';
import { GET as mineGET } from '../app/devices/mine/route';
import { DeviceService } from '../services/device.service';
import { AuthService } from '../lib/service/auth.service';
import { DeviceStatus, DeviceAssignmentMethod } from '@prisma/client';

vi.mock('../services/device.service', () => ({
  DeviceService: {
    provisionDevice: vi.fn(),
    claimDevice: vi.fn(),
    unassignDevice: vi.fn(),
    getActiveAssignmentsForUser: vi.fn(),
  }
}));

vi.mock('../lib/service/auth.service', () => ({
  AuthService: {
    validateSession: vi.fn()
  }
}));

function createRequest(options: { method?: string, headers?: Record<string, string>, body?: any } = {}) {
  const headers = new Headers();
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers.set(k, v);
    }
  }
  return new Request('http://localhost', {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe('Device API Routes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('POST /devices/provision', () => {
    it('returns 503 if server provisioning key is absent', async () => {
      delete process.env.DEVICE_PROVISIONING_KEY;
      const req = createRequest({ method: 'POST' });
      const res = await provisionPOST(req);
      expect(res.status).toBe(503);
    });

    it('returns 401 if provisioning key is missing from request', async () => {
      process.env.DEVICE_PROVISIONING_KEY = 'secret-key';
      const req = createRequest({ method: 'POST' });
      const res = await provisionPOST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 if provisioning key is incorrect', async () => {
      process.env.DEVICE_PROVISIONING_KEY = 'secret-key';
      const req = createRequest({ 
        method: 'POST', 
        headers: { 'x-device-provisioning-key': 'wrong-key' } 
      });
      const res = await provisionPOST(req);
      expect(res.status).toBe(401);
    });

    it('successfully provisions and does not expose hashes', async () => {
      process.env.DEVICE_PROVISIONING_KEY = 'secret-key';
      (DeviceService.provisionDevice as any).mockResolvedValue({
        device: { id: 'd1', deviceId: 'DEV-001', status: DeviceStatus.UNASSIGNED },
        claimCode: '123456',
        deviceToken: 'token-123'
      });

      const req = createRequest({ 
        method: 'POST', 
        headers: { 'x-device-provisioning-key': 'secret-key' },
        body: { deviceId: 'DEV-001' }
      });
      const res = await provisionPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      
      expect(data.device.deviceId).toBe('DEV-001');
      expect(data.claimCode).toBe('123456');
      expect(data.deviceToken).toBe('token-123');
      expect(data.claimCodeHash).toBeUndefined();
      expect(data.deviceTokenHash).toBeUndefined();
    });
  });

  describe('POST /devices/claim', () => {
    it('returns 401 if unauthenticated', async () => {
      const req = createRequest({ method: 'POST' });
      const res = await claimPOST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid claim code format', async () => {
      (AuthService.validateSession as any).mockResolvedValue({ userId: 'u1' });
      const req = createRequest({ 
        method: 'POST', 
        headers: { authorization: 'Bearer valid-token' },
        body: { claimCode: '12X' } // invalid
      });
      const res = await claimPOST(req);
      expect(res.status).toBe(400);
    });

    it('successfully claims and ignores request body userId', async () => {
      (AuthService.validateSession as any).mockResolvedValue({ userId: 'u1' });
      (DeviceService.claimDevice as any).mockResolvedValue({
        isNew: true,
        device: { deviceId: 'DEV-001', status: DeviceStatus.ASSIGNED },
        assignment: { id: 'a1', method: DeviceAssignmentMethod.MOBILE, assignedAt: new Date() }
      });

      const req = createRequest({ 
        method: 'POST', 
        headers: { authorization: 'Bearer valid-token' },
        body: { claimCode: '123456', userId: 'hacker-u2' }
      });
      const res = await claimPOST(req);
      
      expect(res.status).toBe(201);
      expect(DeviceService.claimDevice).toHaveBeenCalledWith({
        userId: 'u1',
        claimCode: '123456',
        method: DeviceAssignmentMethod.MOBILE
      });
      
      const data = await res.json();
      expect(data.deviceId).toBe('DEV-001');
      expect(data.claimCodeHash).toBeUndefined();
    });

    it('returns 200 for idempotent claim', async () => {
      (AuthService.validateSession as any).mockResolvedValue({ userId: 'u1' });
      (DeviceService.claimDevice as any).mockResolvedValue({
        isNew: false,
        device: { deviceId: 'DEV-001', status: DeviceStatus.ASSIGNED },
        assignment: { id: 'a1', method: DeviceAssignmentMethod.MOBILE, assignedAt: new Date() }
      });

      const req = createRequest({ 
        method: 'POST', 
        headers: { authorization: 'Bearer valid-token' },
        body: { claimCode: '123456' }
      });
      const res = await claimPOST(req);
      
      expect(res.status).toBe(200);
    });

    it('returns 409 if assigned to another patient', async () => {
      (AuthService.validateSession as any).mockResolvedValue({ userId: 'u1' });
      (DeviceService.claimDevice as any).mockRejectedValue(new Error('Device is already assigned to another patient'));

      const req = createRequest({ 
        method: 'POST', 
        headers: { authorization: 'Bearer valid-token' },
        body: { claimCode: '123456' }
      });
      const res = await claimPOST(req);
      
      expect(res.status).toBe(409);
    });
  });

  describe('POST /devices/[deviceId]/unassign', () => {
    it('returns 401 if unauthenticated', async () => {
      const req = createRequest({ method: 'POST' });
      const res = await unassignPOST(req, { params: { deviceId: 'DEV-001' } });
      expect(res.status).toBe(401);
    });

    it('returns 403 on wrong-patient unassignment', async () => {
      (AuthService.validateSession as any).mockResolvedValue({ userId: 'u1' });
      (DeviceService.unassignDevice as any).mockRejectedValue(new Error('Device is not assigned to this user'));

      const req = createRequest({ 
        method: 'POST', 
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = await unassignPOST(req, { params: { deviceId: 'DEV-001' } });
      expect(res.status).toBe(403);
    });

    it('successfully unassigns', async () => {
      (AuthService.validateSession as any).mockResolvedValue({ userId: 'u1' });
      (DeviceService.unassignDevice as any).mockResolvedValue({
        device: { deviceId: 'DEV-001', status: DeviceStatus.UNASSIGNED },
        assignment: { unassignedAt: new Date() }
      });

      const req = createRequest({ 
        method: 'POST', 
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = await unassignPOST(req, { params: { deviceId: 'DEV-001' } });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deviceId).toBe('DEV-001');
      expect(data.claimCodeHash).toBeUndefined();
    });
  });

  describe('GET /devices/mine', () => {
    it('returns current patient devices with no hashes', async () => {
      (AuthService.validateSession as any).mockResolvedValue({ userId: 'u1' });
      (DeviceService.getActiveAssignmentsForUser as any).mockResolvedValue([
        {
          id: 'a1', method: DeviceAssignmentMethod.MOBILE, assignedAt: new Date(),
          device: { deviceId: 'DEV-001', status: DeviceStatus.ASSIGNED, lastSeenAt: null, claimCodeHash: 'secret' }
        }
      ]);

      const req = createRequest({ headers: { authorization: 'Bearer valid-token' } });
      const res = await mineGET(req);
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.devices).toHaveLength(1);
      expect(data.devices[0].deviceId).toBe('DEV-001');
      expect(data.devices[0].claimCodeHash).toBeUndefined();
      expect(data.devices[0].assignment.id).toBe('a1');
    });
  });
});
