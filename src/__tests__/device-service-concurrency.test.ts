import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceService } from '../services/device.service';
import { prisma } from '../lib/prisma';
import { DeviceStatus, DeviceAssignmentMethod } from '@prisma/client';

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
    },
    $transaction: vi.fn(),
  }
}));

function createP2002Error(targetField: string | string[]) {
  const error = new Error('Unique constraint failed') as any;
  error.code = 'P2002';
  error.meta = { target: targetField };
  return error;
}

describe('DeviceService Concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test A: concurrent duplicate provisioning', () => {
    it('handles concurrent duplicate provisioning by throwing 409-like error without retrying', async () => {
      // Arrange
      (prisma.device.findUnique as any).mockResolvedValue(null);
      (prisma.device.create as any).mockRejectedValue(createP2002Error('deviceId'));
      
      // Act & Assert
      await expect(DeviceService.provisionDevice({ deviceId: 'CONCUR-001' }))
        .rejects.toThrow('Device already provisioned');
      
      // It should not retry
      expect(prisma.device.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test B: concurrent same-patient claim', () => {
    it('handles concurrent identical claims idempotently', async () => {
      // Arrange
      const userId = 'u1';
      const deviceId = 'd1';
      const claimCode = 'CLAIM-123';
      const claimCodeHash = 'some-hash';
      
      (prisma.user.findUnique as any).mockResolvedValue({ id: userId, email: 'test@ex.com' });
      (prisma.device.findUnique as any).mockResolvedValue({
        id: deviceId,
        deviceId: 'DEV-001',
        status: DeviceStatus.UNASSIGNED,
        claimCodeHash
      });
      
      // Transaction fails with active assignment conflict
      (prisma.$transaction as any).mockRejectedValue(createP2002Error(['DeviceAssignment_deviceRecordId_key']));
      
      // Global re-query finds the assignment belonging to the same user
      const existingAssignment = { id: 'assign1', userId, deviceRecordId: deviceId };
      (prisma.deviceAssignment.findFirst as any).mockResolvedValue(existingAssignment);
      
      // Act
      const result = await DeviceService.claimDevice({ userId, claimCode, method: DeviceAssignmentMethod.MOBILE });
      
      // Assert
      expect(result.isNew).toBe(false);
      expect(result.assignment).toEqual(existingAssignment);
      // Ensure the recovery query occurred outside transaction
      expect(prisma.deviceAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          deviceRecordId: deviceId,
          unassignedAt: null
        }
      });
    });
  });

  describe('Test C: concurrent different-patient claim', () => {
    it('handles concurrent conflicting claims by rejecting one', async () => {
      // Arrange
      const userId = 'u2'; // Second user attempting claim
      const deviceId = 'd1';
      const claimCode = 'CLAIM-123';
      
      (prisma.user.findUnique as any).mockResolvedValue({ id: userId, email: 't2@ex.com' });
      (prisma.device.findUnique as any).mockResolvedValue({
        id: deviceId,
        deviceId: 'DEV-001',
        status: DeviceStatus.UNASSIGNED,
        claimCodeHash: 'some-hash'
      });
      
      // Transaction fails with active assignment conflict
      (prisma.$transaction as any).mockRejectedValue(createP2002Error('DeviceAssignment_deviceRecordId_key'));
      
      // Global re-query finds the assignment belongs to someone else (u1)
      const existingAssignment = { id: 'assign1', userId: 'u1', deviceRecordId: deviceId };
      (prisma.deviceAssignment.findFirst as any).mockResolvedValue(existingAssignment);
      
      // Act & Assert
      await expect(DeviceService.claimDevice({ userId, claimCode, method: DeviceAssignmentMethod.MOBILE }))
        .rejects.toThrow('Device is already assigned to another patient');
    });
  });
});
