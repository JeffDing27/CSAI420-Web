-- CreateEnum
CREATE TYPE "ProfileRole" AS ENUM ('PATIENT', 'CLINICIAN', 'ADMIN');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "externalEmail" TEXT NOT NULL,
    "role" "ProfileRole" NOT NULL DEFAULT 'PATIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_externalEmail_key" ON "Profile"("externalEmail");

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN "profileId" TEXT;

-- AlterTable
ALTER TABLE "CustomerReference" ADD COLUMN "profileId" TEXT;

-- AlterTable
ALTER TABLE "DeviceAssignment" ADD COLUMN "profileId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RapidStepTest" ADD COLUMN "profileId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VoiceSession" ADD COLUMN "profileId" TEXT;

-- CreateIndex
CREATE INDEX "AuditEvent_profileId_idx" ON "AuditEvent"("profileId");

-- CreateIndex
CREATE INDEX "CustomerReference_profileId_idx" ON "CustomerReference"("profileId");

-- CreateIndex
CREATE INDEX "DeviceAssignment_profileId_idx" ON "DeviceAssignment"("profileId");

-- CreateIndex
CREATE INDEX "RapidStepTest_profileId_idx" ON "RapidStepTest"("profileId");

-- CreateIndex
CREATE INDEX "VoiceSession_profileId_idx" ON "VoiceSession"("profileId");

-- AddForeignKey
ALTER TABLE "CustomerReference" ADD CONSTRAINT "CustomerReference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapidStepTest" ADD CONSTRAINT "RapidStepTest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Ownership Check Constraints
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_userId_or_profileId_check" CHECK ("userId" IS NOT NULL OR "profileId" IS NOT NULL);
ALTER TABLE "RapidStepTest" ADD CONSTRAINT "RapidStepTest_userId_or_profileId_check" CHECK ("userId" IS NOT NULL OR "profileId" IS NOT NULL);
