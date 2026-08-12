ALTER TABLE "VoiceSession"
ADD COLUMN "stediSessionToken" TEXT,
ADD COLUMN "deviceId" TEXT,
ADD COLUMN "setOneStepPoints" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "setTwoStepPoints" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "upstreamTestSubmittedAt" TIMESTAMP(3);
