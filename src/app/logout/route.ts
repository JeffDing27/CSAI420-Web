import { NextResponse } from "next/server";
import { AuthService } from "@/lib/service/auth.service";

const getCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-suresteps-session-token",
  };
};

export async function OPTIONS() {
  return new Response(null, { headers: getCorsHeaders() });
}

export async function POST(request: Request) {
  const token = request.headers.get("x-suresteps-session-token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing session token" },
      { status: 401, headers: getCorsHeaders() },
    );
  }

  await AuthService.logout(token);

  return NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200, headers: getCorsHeaders() },
  );
}
