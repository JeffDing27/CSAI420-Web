import { prisma } from "@/utils/prisma";

type RouteContext = {
  params: Promise<{
    customerEmail: string;
  }>;
};

function isAuthenticated(request: Request): boolean {
  const headerNames = Array.from(request.headers.keys());

  const possibleHeaders = [
    "suresteps.session.token",
    "suresteps-session-token",
    "x-suresteps-session-token",
    "authorization",
  ];

  const detectedHeader = possibleHeaders.find((headerName) => {
    const value = request.headers.get(headerName);
    return Boolean(value?.trim());
  });

  console.log(
    `[Week 3 Auth] incomingHeaders: ${headerNames.join(", ")} | detectedHeader: ${detectedHeader ?? "none"}`,
  );

  return Boolean(detectedHeader);
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
