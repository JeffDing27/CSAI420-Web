-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "DeviceAssignmentMethod" AS ENUM ('MOBILE', 'IVR', 'CLINICIAN', 'ADMIN');

-- AlterEnum
ALTER TYPE "TestSource" ADD VALUE 'DEVICE';

-- AlterTable
ALTER TABLE "RapidStepTest" ADD COLUMN "deviceRecordId" TEXT;

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "claimCodeHash" TEXT NOT NULL,
    "deviceTokenHash" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceAssignment" (
    "id" TEXT NOT NULL,
    "deviceRecordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "DeviceAssignmentMethod" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "DeviceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceId_key" ON "Device"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_claimCodeHash_key" ON "Device"("claimCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceTokenHash_key" ON "Device"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "DeviceAssignment_deviceRecordId_idx" ON "DeviceAssignment"("deviceRecordId");

-- CreateIndex
CREATE INDEX "DeviceAssignment_userId_idx" ON "DeviceAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceAssignment_active_device_assignment" ON "DeviceAssignment"("deviceRecordId") WHERE "unassignedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "RapidStepTest" ADD CONSTRAINT "RapidStepTest_deviceRecordId_fkey" FOREIGN KEY ("deviceRecordId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_deviceRecordId_fkey" FOREIGN KEY ("deviceRecordId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
