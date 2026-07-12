import { prisma } from "@/utils/prisma";

type RouteContext = {
  params: Promise<{
    customer: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { customer } = await context.params;
    const body = await request.text();

    if (body !== "true" && body !== "false") {
      return new Response("Consent must be true or false", {
        status: 400,
      });
    }

    const shareData = body === "true";

    await prisma.customerConsent.upsert({
      where: {
        customerEmail: customer,
      },
      update: {
        shareData,
      },
      create: {
        customerEmail: customer,
        shareData,
      },
    });

    return new Response("Consent updated successfully.", {
      status: 200,
    });
  } catch (error) {
    console.error("Consent PATCH error:", error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { customer } = await context.params;

    const consent = await prisma.customerConsent.findUnique({
      where: {
        customerEmail: customer,
      },
    });

    if (!consent) {
      return new Response("false", {
        status: 200,
      });
    }

    return new Response(String(consent.shareData), {
      status: 200,
    });
  } catch (error) {
    console.error("Consent GET error:", error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}
