import { NextResponse } from 'next/server';
import { hasAuth } from '@/utils/auth';
import { listEscalations } from '@/utils/escalation-store';

export async function GET(request: Request) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const escalations = await listEscalations();
  return NextResponse.json(escalations, { status: 200 });
}
