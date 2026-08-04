import { NextResponse } from "next/server";
import { ConsentedClinicianService } from "@/services/consented-clinician.service";

const service = new ConsentedClinicianService();

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:8081",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-suresteps-session-token, suresteps.session.token",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ clinicianUsername: string }>;
  },
) {
  try {
    const { clinicianUsername } = await params;

    const patients = await service.getPatientsForClinician(clinicianUsername);

    return NextResponse.json(patients, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Failed to load assigned patients:", error);

    return NextResponse.json(
      { error: "Failed to load assigned patients." },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}
