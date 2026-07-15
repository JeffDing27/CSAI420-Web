import { getClinicianAccessRequests } from "@/utils/clinician-access-store";
import { NextResponse } from "next/server";

function hasAuth(request: Request): boolean {
  const possibleTokenHeaders = [
    "suresteps.session.token",
    "x-suresteps-session-token",
    "suresteps-session-token",
    "authorization"
  ];
  return possibleTokenHeaders.some(h => request.headers.has(h));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customer: string }> }
) {
  if (!hasAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { customer } = await params;
  
  const requests = await getClinicianAccessRequests(customer);
  
  return NextResponse.json(requests, { status: 200 });
}
