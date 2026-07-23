import { prisma } from "@/utils/prisma";
import { getSessionToken } from "@/utils/pass-through";

type RouteContext = {
  params: Promise<{
    customerEmail: string;
  }>;
};

function isAuthenticated(request: Request): boolean {
  return Boolean(getSessionToken(request));
}

export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isAuthenticated(request)) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const { customerEmail } = await context.params;
    const decodedCustomerEmail = decodeURIComponent(customerEmail).trim();

    if (!decodedCustomerEmail) {
      return new Response("Customer email is required", {
        status: 400,
      });
    }

    const requests = await prisma.clinicianAccessRequest.findMany({
      where: {
        customerEmail: decodedCustomerEmail,
      },
      select: {
        clinicianUsername: true,
        customerEmail: true,
        requestDate: true,
        status: true,
      },
      orderBy: {
        requestDate: "asc",
      },
    });

    return Response.json(requests, {
      status: 200,
    });
  } catch (error) {
    console.error("Clinician access requests GET error:", error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}
