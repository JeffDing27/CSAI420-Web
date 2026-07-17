import { NextResponse } from "next/server";
import { EscalationService } from "@/services/escalation.service";
import { hasAuth } from "@/utils/auth";

export async function GET(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const service = new EscalationService();
  const escalations = await service.getEscalations();
  return NextResponse.json(escalations, { status: 200 });
}
