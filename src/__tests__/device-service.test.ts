import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { DeviceService } from '../services/device.service';
import { DeviceStatus, DeviceAssignmentMethod } from '@prisma/client';
import { hashClaimCode, hashDeviceToken, generateClaimCode, generateDeviceToken } from '../utils/device-secrets';

vi.mock('../lib/prisma', () => ({
  prisma: {
    device: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    deviceAssignment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  }
}));

describe('DeviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provisionDevice', () => {
    it('successfully provisions a device and returns raw secrets while persisting hashes', async () => {
      const deviceId = 'DEV-123';
      (prisma.device.findUnique as any).mockResolvedValue(null);
      (prisma.device.create as any).mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'record-123' }));

      const result = await DeviceService.provisionDevice({ deviceId });

      expect(result.device.deviceId).toBe('DEV-123');
      expect(result.device.status).toBe(DeviceStatus.UNASSIGNED);
      expect(result.claimCode).toBeDefined();
      expect(result.deviceToken).toBeDefined();

      const createCallArgs = (prisma.device.create as any).mock.calls[0][0];
      
      // raw secrets returned but only hashes persisted
      expect(createCallArgs.data.claimCodeHash).toBeDefined();
      expect(createCallArgs.data.claimCodeHash).not.toBe(result.claimCode);
      expect(createCallArgs.data.deviceTokenHash).toBeDefined();
      expect(createCallArgs.data.deviceTokenHash).not.toBe(result.deviceToken);
    });

    it('rejects duplicate device ID', async () => {
      const deviceId = 'DEV-123';
      (prisma.device.findUnique as any).mockResolvedValue({ id: 'existing' });

      await expect(DeviceService.provisionDevice({ deviceId }))
        .rejects
        .toThrow('Device already provisioned');
    });
  });

  describe('claimDevice', () => {
    it('successfully assigns a device via mobile', async () => {
      const rawClaimCode = '123456';
      const claimCodeHash = hashClaimCode(rawClaimCode);
      
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1' });
      (prisma.device.findUnique as any).mockResolvedValue({ 
        id: 'dev-1', 
        status: DeviceStatus.UNASSIGNED,
        claimCodeHash 
      });
      (prisma.deviceAssignment.findFirst as any).mockResolvedValue(null);
      (prisma.deviceAssignment.create as any).mockResolvedValue({ id: 'assignment-1' });
      (prisma.device.update as any).mockResolvedValue({ status: DeviceStatus.ASSIGNED });

      const result = await DeviceService.claimDevice({ 
        userId: 'user-1', 
        claimCode: rawClaimCode, 
        method: DeviceAssignmentMethod.MOBILE 
      });

      expect(result.assignment.id).toBe('assignment-1');
      expect((prisma.deviceAssignment.create as any).mock.calls[0][0].data.method).toBe(DeviceAssignmentMethod.MOBILE);
    });

    it('successfully assigns a device via IVR', async () => {
      const rawClaimCode = '123456';
      const claimCodeHash = hashClaimCode(rawClaimCode);
      
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1' });
      (prisma.device.findUnique as any).mockResolvedValue({ 
        id: 'dev-1', 
        status: DeviceStatus.UNASSIGNED,
        claimCodeHash 
      });
      (prisma.deviceAssignment.findFirst as any).mockResolvedValue(null);
      (prisma.deviceAssignment.create as any).mockResolvedValue({ id: 'assignment-1' });
      (prisma.device.update as any).mockResolvedValue({ status: DeviceStatus.ASSIGNED });

      const result = await DeviceService.claimDevice({ 
        userId: 'user-1', 
        claimCode: rawClaimCode, 
        method: DeviceAssignmentMethod.IVR 
      });

      expect(result.assignment.id).toBe('assignment-1');
      expect((prisma.deviceAssignment.create as any).mock.calls[0][0].data.method).toBe(DeviceAssignmentMethod.IVR);
    });

    it('rejects invalid claim code', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1' });
      (prisma.device.findUnique as any).mockResolvedValue(null);

      await expect(DeviceService.claimDevice({ 
        userId: 'user-1', 
        claimCode: 'invalid', 
        method: DeviceAssignmentMethod.MOBILE 
      })).rejects.toThrow('Invalid claim code');
    });

    it('idempotent assignment to the same patient', async () => {
      const rawClaimCode = '123456';
      const claimCodeHash = hashClaimCode(rawClaimCode);
      
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1' });
      const device = { 
        id: 'dev-1', 
        status: DeviceStatus.ASSIGNED,
        claimCodeHash 
      };
      (prisma.device.findUnique as any).mockResolvedValue(device);
      (prisma.deviceAssignment.findFirst as any).mockResolvedValue({ 
        id: 'assignment-1', 
        userId: 'user-1' 
      });

      const result = await DeviceService.claimDevice({ 
        userId: 'user-1', 
        claimCode: rawClaimCode, 
        method: DeviceAssignmentMethod.MOBILE 
      });

      expect(result.assignment.id).toBe('assignment-1');
      expect(prisma.deviceAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects when assigned to another patient', async () => {
      const rawClaimCode = '123456';
      const claimCodeHash = hashClaimCode(rawClaimCode);
      
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1' });
      (prisma.device.findUnique as any).mockResolvedValue({ 
        id: 'dev-1', 
        status: DeviceStatus.ASSIGNED,
        claimCodeHash 
      });
      (prisma.deviceAssignment.findFirst as any).mockResolvedValue({ 
        id: 'assignment-1', 
        userId: 'user-2' // Different user
      });

      await expect(DeviceService.claimDevice({ 
        userId: 'user-1', 
        claimCode: rawClaimCode, 
        method: DeviceAssignmentMethod.MOBILE 
      })).rejects.toThrow('Device is already assigned to another patient');
    });
    
    it('rejects RETIRED devices', async () => {
      const rawClaimCode = '123456';
      const claimCodeHash = hashClaimCode(rawClaimCode);
      
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-1' });
      (prisma.device.findUnique as any).mockResolvedValue({ 
        id: 'dev-1', 
        status: DeviceStatus.RETIRED,
        claimCodeHash 
      });

      await expect(DeviceService.claimDevice({ 
        userId: 'user-1', 
        claimCode: rawClaimCode, 
        method: DeviceAssignmentMethod.MOBILE 
      })).rejects.toThrow('Device is retired');
    });
  });

  describe('unassignDevice', () => {
    it('successfully unassigns a device', async () => {
      (prisma.device.findUnique as any).mockResolvedValue({ id: 'dev-1' });
      (prisma.deviceAssignment.findFirst as any).mockResolvedValue({ id: 'assignment-1' });
      (prisma.deviceAssignment.update as any).mockResolvedValue({ id: 'assignment-1', unassignedAt: new Date() });
      (prisma.device.update as any).mockResolvedValue({ status: DeviceStatus.UNASSIGNED });

      const result = await DeviceService.unassignDevice({ deviceId: 'DEV-123' });
      
      expect(prisma.deviceAssignment.update).toHaveBeenCalled();
      expect(prisma.device.update).toHaveBeenCalled();
      expect(result.device.status).toBe(DeviceStatus.UNASSIGNED);
    });
  });

  describe('authenticateDevice', () => {
    it('successfully authenticates with correct device token', async () => {
      const rawToken = 'super-secret-token';
      const deviceTokenHash = hashDeviceToken(rawToken);
      const device = { id: 'dev-1', status: DeviceStatus.ASSIGNED, deviceTokenHash };
      
      (prisma.device.findUnique as any).mockResolvedValue(device);

      const result = await DeviceService.authenticateDevice({ deviceId: 'DEV-123', deviceToken: rawToken });
      
      expect(result.id).toBe('dev-1');
    });

    it('rejects invalid device token', async () => {
      const rawToken = 'super-secret-token';
      const deviceTokenHash = hashDeviceToken(rawToken);
      const device = { id: 'dev-1', status: DeviceStatus.ASSIGNED, deviceTokenHash };
      
      (prisma.device.findUnique as any).mockResolvedValue(device);

      await expect(DeviceService.authenticateDevice({ deviceId: 'DEV-123', deviceToken: 'wrong-token' }))
        .rejects.toThrow('Invalid device credentials');
    });

    it('rejects retired devices from authenticating', async () => {
      const rawToken = 'super-secret-token';
      const deviceTokenHash = hashDeviceToken(rawToken);
      const device = { id: 'dev-1', status: DeviceStatus.RETIRED, deviceTokenHash };
      
      (prisma.device.findUnique as any).mockResolvedValue(device);

      await expect(DeviceService.authenticateDevice({ deviceId: 'DEV-123', deviceToken: rawToken }))
        .rejects.toThrow('Device is retired');
    });
  });
});
