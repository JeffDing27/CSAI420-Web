import { prisma } from "@/utils/prisma";
import { getSessionToken } from "@/utils/pass-through";

type RouteContext = {
  params: Promise<{
    escalationId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    if (!getSessionToken(request)) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const { escalationId } = await context.params;

    const escalation = await prisma.escalation.findUnique({
      where: {
        id: escalationId,
      },
    });

    if (!escalation) {
      return new Response("Escalation not found", {
        status: 404,
      });
    }

    return Response.json(
      {
        escalationId: escalation.id,
        status: escalation.status,
        originalQuestion: escalation.originalQuestion,
        phoneNumber: escalation.phoneNumber,
        responsePreference: escalation.responsePreference,
        aiResponse: escalation.aiResponse,
        escalationTimestamp: escalation.escalationTimestamp.toISOString(),
        priority: escalation.priority,
        category: escalation.category,
        waitingForResponse: escalation.waitingForResponse,
        sessionId: escalation.sessionId,
        userId: escalation.userId,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Failed to retrieve escalation:", error);

    return new Response("Service temporarily unavailable. Please try again.", {
      status: 500,
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    if (!getSessionToken(request)) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const { escalationId } = await context.params;

    const escalation = await prisma.escalation.findUnique({
      where: {
        id: escalationId,
      },
    });

    if (!escalation) {
      return new Response("Escalation not found", {
        status: 404,
      });
    }

    await prisma.escalation.delete({
      where: {
        id: escalationId,
      },
    });

    return new Response("Escalation deleted successfully", {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to delete escalation:", error);

    return new Response("Service temporarily unavailable. Please try again.", {
      status: 500,
    });
  }
}
