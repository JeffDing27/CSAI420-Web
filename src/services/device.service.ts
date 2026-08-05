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

function isP2002Conflict(error: any, fieldName: string): boolean {
  if (error?.code !== 'P2002') return false;
  const target = error?.meta?.target;
  
  if (Array.isArray(target)) {
    return target.some(t => typeof t === 'string' && t.includes(fieldName));
  }
  
  if (typeof target === 'string') {
    return target.includes(fieldName);
  }
  
  return false;
}

export class DeviceService {
  static async provisionDevice({ deviceId }: { deviceId: string }) {
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    
    const existing = await prisma.device.findUnique({
      where: { deviceId: normalizedDeviceId }
    });
    
    if (existing) {
      throw new Error('Device already provisioned');
    }
    
    // Relying on Prisma P2002 to catch concurrent provisioning
    
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
        if (isP2002Conflict(error, 'claimCodeHash') || isP2002Conflict(error, 'deviceTokenHash')) {
          attempts++;
        } else if (isP2002Conflict(error, 'deviceId')) {
          throw new Error('Device already provisioned');
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
    
    try {
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
    } catch (error: any) {
      // If concurrent request won the race, Prisma throws P2002 on the partial unique index
      if (isP2002Conflict(error, 'deviceRecordId') || isP2002Conflict(error, 'DeviceAssignment_deviceRecordId_key') || isP2002Conflict(error, 'deviceAssignment')) {
        const activeAssignment = await prisma.deviceAssignment.findFirst({
          where: {
            deviceRecordId: device.id,
            unassignedAt: null
          }
        });
        if (activeAssignment && activeAssignment.userId === userId) {
          return { device, assignment: activeAssignment, isNew: false };
        } else {
          throw new Error('Device is already assigned to another patient');
        }
      }
      throw error;
    }
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

  static async recordHeartbeat({ deviceRecordId, receivedAt }: { deviceRecordId: string, receivedAt: Date }) {
    return await prisma.device.update({
      where: { id: deviceRecordId },
      data: { lastSeenAt: receivedAt },
      select: {
        id: true,
        deviceId: true,
        status: true,
        lastSeenAt: true
      }
    });
  }
}
