-- CreateTable
CREATE TABLE "CustomerConsent" (
    "customerEmail" TEXT NOT NULL,
    "shareData" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerConsent_pkey" PRIMARY KEY ("customerEmail")
);

-- CreateTable
CREATE TABLE "ConsentedClinician" (
    "id" SERIAL NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "clinicianEmail" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentedClinician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentedClinician_customerEmail_clinicianEmail_key" ON "ConsentedClinician"("customerEmail", "clinicianEmail");
