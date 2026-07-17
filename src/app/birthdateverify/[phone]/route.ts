import { NextResponse } from "next/server";

const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

export async function OPTIONS() {
  return new Response(null, { headers: getCorsHeaders() });
}

export async function POST(request: Request, { params }: { params: { phone: string } }) {
  if (process.env.USE_LOCAL_USER_STORE === "true") {
    // Simulated behavior for prototype compatibility
    return new Response("OK", { status: 200, headers: { ...getCorsHeaders(), "content-type": "text/plain" } });
  }
  return NextResponse.json({ error: "Not implemented for proxy" }, { status: 501, headers: getCorsHeaders() });
}
