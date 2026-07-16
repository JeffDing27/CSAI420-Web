import { NextResponse } from "next/server";
import { hasAuth } from "@/utils/auth";
import { EscalationService } from "@/services/escalation.service";

export async function GET(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const service = new EscalationService();
  const escalations = await service.getEscalations();
  return NextResponse.json(escalations, { status: 200 });
}
