import { prisma } from "@/utils/prisma";

type AccessRequestBody = {
  clinicianUsername?: string;
  customerEmail?: string;
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
async function readRequestBody(
  request: Request,
): Promise<AccessRequestBody | null> {
  try {
    return (await request.json()) as AccessRequestBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthenticated(request)) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const body = await readRequestBody(request);

    if (!body) {
      return new Response("Invalid request body", {
        status: 400,
      });
    }

    const clinicianUsername = body.clinicianUsername?.trim();
    const customerEmail = body.customerEmail?.trim();

    if (!clinicianUsername || !customerEmail) {
      return new Response(
        "Clinician username and customer email are required",
        {
          status: 400,
        },
      );
    }

    await prisma.clinicianAccessRequest.upsert({
      where: {
        clinicianUsername_customerEmail: {
          clinicianUsername,
          customerEmail,
        },
      },
      update: {
        requestDate: new Date(),
        status: "pending",
      },
      create: {
        clinicianUsername,
        customerEmail,
        status: "pending",
      },
    });

    return new Response("Access request submitted successfully", {
      status: 201,
    });
  } catch (error) {
    console.error("Clinician access request POST error:", error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthenticated(request)) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const body = await readRequestBody(request);

    if (!body) {
      return new Response("Invalid request body", {
        status: 400,
      });
    }

    const clinicianUsername = body.clinicianUsername?.trim();
    const customerEmail = body.customerEmail?.trim();

    if (!clinicianUsername || !customerEmail) {
      return new Response(
        "Clinician username and customer email are required",
        {
          status: 400,
        },
      );
    }

    const result = await prisma.clinicianAccessRequest.deleteMany({
      where: {
        clinicianUsername,
        customerEmail,
        status: "pending",
      },
    });

    if (result.count === 0) {
      return new Response("Access request not found", {
        status: 404,
      });
    }

    return new Response("Access request deleted successfully", {
      status: 200,
    });
  } catch (error) {
    console.error("Clinician access request DELETE error:", error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}
