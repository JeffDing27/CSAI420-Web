import { prisma } from "@/utils/prisma";
import { getSessionToken, validateSessionToken } from "@/utils/pass-through";

type AccessRequestBody = {
  clinicianUsername?: string;
  customerEmail?: string;
};

async function getAuthErrorResponse(
  request: Request,
  customerEmail: string,
): Promise<Response | null> {
  const token = getSessionToken(request);

  if (!token) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const isValidSession = await validateSessionToken(token, customerEmail);

  if (!isValidSession) {
    return new Response("Forbidden", {
      status: 403,
    });
  }

  return null;
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

    const authError = await getAuthErrorResponse(request, customerEmail);

    if (authError) {
      return authError;
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

    const authError = await getAuthErrorResponse(request, customerEmail);

    if (authError) {
      return authError;
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
