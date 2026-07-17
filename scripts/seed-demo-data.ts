import { PrismaClient } from "@prisma/client";
import { AuthService } from "../src/lib/service/auth.service";
import crypto from "crypto";
import { RepositoryFactory } from "../src/repositories/provider-factory";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding demo data...");

  // We need to use AuthService to properly hash passwords
  const demoPassword = process.env.DEMO_PASSWORD || "DemoPassword123!";
  console.log("Using demo password (set via DEMO_PASSWORD env var, default: DemoPassword123!)");

  const users = [
    {
      userName: "patient.demo",
      email: "patient.demo@example.com",
      firstName: "Demo",
      lastName: "Patient",
      phone: "+15550000001",
      birthDate: "01/01/1980",
      region: "US",
      role: "PATIENT"
    },
    {
      userName: "clinician.demo",
      email: "clinician.demo@example.com",
      firstName: "Demo",
      lastName: "Clinician",
      phone: "+15550000002",
      birthDate: "02/02/1980",
      region: "US",
      role: "CLINICIAN"
    },
    {
      userName: "moderator.demo",
      email: "moderator.demo@example.com",
      firstName: "Demo",
      lastName: "Moderator",
      phone: "+15550000003",
      birthDate: "03/03/1980",
      region: "US",
      role: "MODERATOR"
    },
    {
      userName: "admin.demo",
      email: "admin.demo@example.com",
      firstName: "Demo",
      lastName: "Admin",
      phone: "+15550000004",
      birthDate: "04/04/1980",
      region: "US",
      role: "ADMIN"
    }
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await AuthService.register({
        userName: u.userName,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        birthDate: u.birthDate,
        region: u.region,
        password: demoPassword,
      });
      // Update role (register defaults to PATIENT)
      await prisma.user.update({
        where: { email: u.email },
        data: { role: u.role as any }
      });
      console.log(`Created user: ${u.email} with role ${u.role}`);
    } else {
      console.log(`User ${u.email} already exists.`);
    }
  }

  // Create demo data relationships
  const patient = await prisma.user.findUnique({ where: { email: "patient.demo@example.com" } });
  const clinician = await prisma.user.findUnique({ where: { email: "clinician.demo@example.com" } });
  const moderator = await prisma.user.findUnique({ where: { email: "moderator.demo@example.com" } });

  if (patient && clinician && moderator) {
    // 1. Consent and CustomerRef
    const customerId = "demo_customer_123";
    const existingCustomerRef = await prisma.customerReference.findFirst({ where: { userId: patient.id } });
    if (!existingCustomerRef) {
      await prisma.customerReference.create({
        data: {
          name: `${patient.firstName} ${patient.lastName}`,
          phone: patient.phone,
          email: patient.email,
          userId: patient.id,
          externalCustomerId: customerId
        }
      });
      console.log("Created CustomerReference for patient.");
    }

    const existingConsent = await prisma.consent.findUnique({ where: { customer: customerId } });
    if (!existingConsent) {
      await prisma.consent.create({
        data: {
          customer: customerId,
          status: true
        }
      });
      console.log("Created active Consent for patient.");
    }

    const existingAccess = await prisma.consentedClinician.findUnique({
      where: { customer_clinicianUsername: { customer: customerId, clinicianUsername: clinician.userName } }
    });
    if (!existingAccess) {
      await prisma.consentedClinician.create({
        data: {
          customer: customerId,
          clinicianUsername: clinician.userName
        }
      });
      console.log("Created ConsentedClinician relationship.");
    }

    const existingReq = await prisma.clinicianAccessRequest.findUnique({
      where: { customerEmail_clinicianUsername: { customerEmail: patient.email, clinicianUsername: clinician.userName } }
    });
    if (!existingReq) {
      await prisma.clinicianAccessRequest.create({
        data: {
          clinicianUsername: clinician.userName,
          customerEmail: patient.email,
          status: "approved",
          requestDate: new Date()
        }
      });
      console.log("Created approved ClinicianAccessRequest.");
    }

    // 2. Balance Tests
    const existingTest = await prisma.rapidStepTest.findFirst({ where: { userId: patient.id } });
    if (!existingTest) {
      await prisma.rapidStepTest.create({
        data: {
          userId: patient.id,
          source: "MOBILE",
          testData: { "score": 85, "duration": 12.4 },
          completedAt: new Date()
        }
      });
      await prisma.rapidStepTest.create({
        data: {
          userId: patient.id,
          source: "IVR",
          testData: { "score": 75, "duration": 15.2 },
          completedAt: new Date()
        }
      });
      console.log("Created simulated RapidStepTests.");
    }

    // 3. Escalations
    const existingEsc = await prisma.escalation.findFirst({ where: { userId: patient.id } });
    if (!existingEsc) {
      const esc = await prisma.escalation.create({
        data: {
          escalationId: `esc_demo_${Date.now()}`,
          userId: patient.id,
          phoneNumber: patient.phone,
          originalQuestion: "I feel dizzy, what should I do?",
          aiResponse: "I cannot provide medical advice.",
          questionTimestamp: new Date(),
          escalationTimestamp: new Date(),
          responsePreference: "CHAT",
          priority: "HIGH",
          category: "MEDICAL",
          status: "RESOLVED",
          coachId: moderator.id,
          resolutionTimestamp: new Date()
        }
      });
      await prisma.coachResponse.create({
        data: {
          escalationId: esc.escalationId,
          coachId: moderator.id,
          message: "Please rest and contact your doctor if dizziness persists.",
          deliveryMethod: "CHAT",
          deliveryStatus: "DELIVERED"
        }
      });
      console.log("Created simulated Escalation and CoachResponse.");
    }
  }

  console.log("Demo data seeding complete!");
}

seed().catch(e => {
  console.error("Seeding error:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
