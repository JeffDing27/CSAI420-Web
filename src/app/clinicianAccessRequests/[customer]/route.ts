import { getClinicianAccessRequests } from "@/utils/clinician-access-store";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customer: string }> }
) {
  const { customer } = await params;
  
  const requests = await getClinicianAccessRequests(customer);
  
  return NextResponse.json(requests, { status: 200 });
}
