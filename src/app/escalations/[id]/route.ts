import { NextResponse } from "next/server";
import { EscalationService } from "@/services/escalation.service";
import { hasAuth } from "@/utils/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { status } = body;
  if (!status || !["escalated", "assigned", "resolved"].includes(status)) {
    return new Response("Invalid or missing status", { status: 400 });
  }

  const service = new EscalationService();
  const esc = await service.getEscalation(id);
  if (!esc) {
    return new Response("Escalation not found", { status: 404 });
  }

  await service.updateEscalationStatus(id, status);

  return NextResponse.json(
    { message: "Status updated successfully" },
    { status: 200 },
  );
}
