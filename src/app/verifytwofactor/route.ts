import { NextResponse } from "next/server";
import { RepositoryFactory } from "@/repositories/provider-factory";
import crypto from "crypto";

const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

export async function OPTIONS() {
  return new Response(null, { headers: getCorsHeaders() });
}

export async function POST(request: Request) {
  if (process.env.USE_LOCAL_USER_STORE === "true") {
    try {
      const body = await request.json();
      // Simulation: find a user (by phone or fallback) to generate a token for
      // To be safe, just grab any user, or the one matching the phone number if passed.
      const phone = body.phoneNumber || body.phone || "+15551234567";
      const userRepo = RepositoryFactory.getUserRepository();
      const user = await userRepo.findByPhone(phone) || await userRepo.findByEmail("patient.demo@example.com");
      
      if (!user) {
         return new Response("No test user available", { status: 400, headers: getCorsHeaders() });
      }
      
      const token = crypto.randomBytes(32).toString("hex");
      await RepositoryFactory.getSessionRepository().createSession(user.id, token, new Date(Date.now() + 86400000));
      
      return new Response(token, { status: 200, headers: { ...getCorsHeaders(), "content-type": "text/plain" } });
    } catch (e) {
      return new Response("OK", { status: 200, headers: { ...getCorsHeaders(), "content-type": "text/plain" } });
    }
  }
  return NextResponse.json({ error: "Not implemented for proxy" }, { status: 501, headers: getCorsHeaders() });
}
