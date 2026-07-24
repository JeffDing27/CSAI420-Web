import { NextResponse } from "next/server";
import { EscalationService } from "@/services/escalation.service";
import { hasAuth } from "@/utils/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ escalationId: string }> }
) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { escalationId } = await params;
  const service = new EscalationService();

  try {
    const escalation = await service.getEscalation(escalationId);
    if (!escalation) {
      return new Response("Not found", { status: 404 });
    }

    return NextResponse.json({
      escalationId: escalation.escalationId,
      status: escalation.status.toLowerCase(), // Public API expects lowercase status
      originalQuestion: escalation.originalQuestion,
      aiResponse: escalation.aiResponse,
      phoneNumber: escalation.phoneNumber,
      responsePreference: escalation.responsePreference.toLowerCase(),
      escalationTimestamp: escalation.escalationTimestamp,
      priority: escalation.priority.toLowerCase(),
      category: escalation.category.toLowerCase(),
    });
  } catch (error) {
    console.error("Failed to get escalation", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ escalationId: string }> }
) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { escalationId } = await params;
  const service = new EscalationService();

  try {
    const escalation = await service.getEscalation(escalationId);
    if (!escalation) {
      return new Response("Not found", { status: 404 });
    }

    await prisma.escalation.delete({
      where: { escalationId }
    });

    return new Response("Deleted successfully", { status: 200 });
  } catch (error) {
    console.error("Failed to delete escalation", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
