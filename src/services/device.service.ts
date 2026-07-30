import { DeviceStatus, DeviceAssignmentMethod } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  generateClaimCode,
  generateDeviceToken,
  hashClaimCode,
  hashDeviceToken,
  verifyDeviceToken,
  normalizeDeviceId
} from '../utils/device-secrets';

export class DeviceService {
  static async provisionDevice({ deviceId }: { deviceId: string }) {
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    
    const existing = await prisma.device.findUnique({
      where: { deviceId: normalizedDeviceId }
    });
    
    if (existing) {
      throw new Error('Device already provisioned');
    }
    
    let claimCode = '';
    let deviceToken = '';
    let device = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      claimCode = generateClaimCode();
      deviceToken = generateDeviceToken();
      const claimCodeHash = hashClaimCode(claimCode);
      const deviceTokenHash = hashDeviceToken(deviceToken);
      try {
        device = await prisma.device.create({
          data: {
            deviceId: normalizedDeviceId,
            claimCodeHash,
            deviceTokenHash,
            status: DeviceStatus.UNASSIGNED,
          }
        });
        break;
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('claimCodeHash')) {
          attempts++;
        } else {
          throw error;
        }
      }
    }

    if (!device) {
      throw new Error('Failed to generate a unique claim code');
    }
    
    return {
      device,
      claimCode,
      deviceToken
    };
  }

  static async claimDevice({ userId, claimCode, method }: { userId: string, claimCode: string, method: DeviceAssignmentMethod }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    
    const claimCodeHash = hashClaimCode(claimCode);
    const device = await prisma.device.findUnique({
      where: { claimCodeHash }
    });
    
    if (!device) {
      throw new Error('Invalid claim code');
    }
    
    if (device.status === DeviceStatus.RETIRED) {
      throw new Error('Device is retired');
    }
    
    return await prisma.$transaction(async (tx) => {
      const activeAssignment = await tx.deviceAssignment.findFirst({
        where: {
          deviceRecordId: device.id,
          unassignedAt: null
        }
      });
      
      if (activeAssignment) {
        if (activeAssignment.userId === userId) {
          return { device, assignment: activeAssignment, isNew: false };
        } else {
          throw new Error('Device is already assigned to another patient');
        }
      }
      
      const assignment = await tx.deviceAssignment.create({
        data: {
          deviceRecordId: device.id,
          userId,
          method
        }
      });
      
      const updatedDevice = await tx.device.update({
        where: { id: device.id },
        data: { status: DeviceStatus.ASSIGNED }
      });
      
      return { device: updatedDevice, assignment, isNew: true };
    });
  }

  static async unassignDevice({ deviceId, userId }: { deviceId: string, userId?: string }) {
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    
    return await prisma.$transaction(async (tx) => {
      const device = await tx.device.findUnique({
        where: { deviceId: normalizedDeviceId }
      });
      
      if (!device) {
        throw new Error('Device not found');
      }
      
      const activeAssignment = await tx.deviceAssignment.findFirst({
        where: {
          deviceRecordId: device.id,
          unassignedAt: null
        }
      });
      
      if (!activeAssignment) {
        throw new Error('Device is not currently assigned');
      }
      
      if (userId && activeAssignment.userId !== userId) {
        throw new Error('Device is not assigned to this user');
      }
      
      const updatedAssignment = await tx.deviceAssignment.update({
        where: { id: activeAssignment.id },
        data: { unassignedAt: new Date() }
      });
      
      const updatedDevice = await tx.device.update({
        where: { id: device.id },
        data: { status: DeviceStatus.UNASSIGNED }
      });
      
      return { device: updatedDevice, assignment: updatedAssignment };
    });
  }

  static async authenticateDevice({ deviceId, deviceToken }: { deviceId: string, deviceToken: string }) {
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    const device = await prisma.device.findUnique({
      where: { deviceId: normalizedDeviceId }
    });
    
    if (!device) {
      throw new Error('Invalid device credentials');
    }
    
    if (device.status === DeviceStatus.RETIRED) {
      throw new Error('Device is retired');
    }
    
    if (!verifyDeviceToken(deviceToken, device.deviceTokenHash)) {
      throw new Error('Invalid device credentials');
    }
    
    return device;
  }

  static async getActiveAssignment(deviceRecordId: string) {
    return await prisma.deviceAssignment.findFirst({
      where: {
        deviceRecordId,
        unassignedAt: null
      },
      include: {
        user: true
      }
    });
  }

  static async getActiveAssignmentsForUser(userId: string) {
    return await prisma.deviceAssignment.findMany({
      where: {
        userId,
        unassignedAt: null
      },
      include: {
        device: {
          select: {
            deviceId: true,
            status: true,
            lastSeenAt: true,
          }
        }
      }
    });
  }
}
