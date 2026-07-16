import { getClinicianAccessRequests } from "@/utils/clinician-access-store";
import { NextResponse } from "next/server";

import { hasAuth } from "@/utils/auth";

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
