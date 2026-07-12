import { prisma } from "@/utils/prisma";

type RouteContext = {
  params: Promise<{
    customer: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { customer } = await context.params;
    const clinicianEmail = (await request.text()).trim();

    if (!clinicianEmail) {
      return new Response("Clinician email is required", {
        status: 400,
      });
    }

    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    await prisma.consentedClinician.upsert({
      where: {
        customerEmail_clinicianEmail: {
          customerEmail: customer,
          clinicianEmail,
        },
      },
      update: {
        expirationDate,
      },
      create: {
        customerEmail: customer,
        clinicianEmail,
        expirationDate,
      },
    });

    return new Response("Clinician consent updated successfully.", {
      status: 200,
    });
  } catch (error) {
    console.error("Clinician PATCH error:", error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { customer } = await context.params;

    const clinicians = await prisma.consentedClinician.findMany({
      where: {
        customerEmail: customer,
      },
      select: {
        clinicianEmail: true,
        expirationDate: true,
      },
    });

    const response = clinicians.map((clinician) => [
      clinician.clinicianEmail,
      clinician.expirationDate,
    ]);

    return Response.json(response, {
      status: 200,
    });
  } catch (error) {
    console.error("Clinician GET error:", error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}
