-- Add patient/provider authorization roles required by the web account portals.
CREATE TYPE "Role" AS ENUM ('PATIENT', 'CLINICIAN', 'MODERATOR', 'ADMIN');

ALTER TABLE "User"
ADD COLUMN "role" "Role" NOT NULL DEFAULT 'PATIENT';
