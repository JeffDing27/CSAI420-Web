import { NextResponse } from "next/server";
import { StediAuthService } from "@/lib/service/stedi-auth.service";

const getCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, suresteps.session.token, x-stedi-device-id, x-stedi-device-token",
  };
};

export async function OPTIONS() {
  return new Response(null, { headers: getCorsHeaders() });
}

export async function POST(request: Request) {
  let bodyStr = "";
  let payload: any = null;

  try {
    bodyStr = await request.text();
    payload = JSON.parse(bodyStr);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: getCorsHeaders() },
    );
  }

  const userName = payload.userName || payload.email;
  const password = payload.password;

  if (!userName || !password) {
    return new Response("Missing userName or password", {
      status: 400,
      headers: getCorsHeaders(),
    });
  }

  // 1. Forward credentials to STEDI
  const authResult = await StediAuthService.login(userName, password);

  if (authResult.error || !authResult.token) {
    return new Response(authResult.error || "Login failed", {
      status: authResult.status || 401,
      headers: getCorsHeaders(),
    });
  }

  // 2. Validate Token via GET /validate/{token}
  const validateResult = await StediAuthService.validateToken(authResult.token);

  if (validateResult.error || !validateResult.email) {
    return new Response(validateResult.error || "Invalid session created", {
      status: validateResult.status || 401,
      headers: getCorsHeaders(),
    });
  }

  // 3. Upsert Profile using the trusted returned email
  try {
    await StediAuthService.upsertProfile(validateResult.email);
  } catch (error) {
    console.error("Failed to upsert profile after login:", error);
    // Even if local DB fails, STEDI auth was successful, but we should fail safely
    return new Response("Internal Server Error", {
      status: 500,
      headers: getCorsHeaders(),
    });
  }

  // Return the token exactly as expected (text token)
  return new Response(authResult.token, {
    status: 200,
    headers: { ...getCorsHeaders(), "content-type": "text/plain" },
  });
}
