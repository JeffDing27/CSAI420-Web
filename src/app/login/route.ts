import crypto from "crypto";
import { NextResponse } from "next/server";
import { AuthService } from "@/lib/service/auth.service";
import { kvGet } from "@/utils/kv-store";
import { forwardRequest } from "@/utils/pass-through";

const getCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  // 1. Local Fallback Mode
  if (process.env.USE_LOCAL_USER_STORE === "true") {
    const userName = payload.userName || payload.email;
    const password = payload.password;

    if (!userName || !password) {
      return new Response("Missing userName or password", {
        status: 400,
        headers: getCorsHeaders(),
      });
    }

    const { token, error } = await AuthService.login(userName, password);

    if (error) {
      return new Response(error, { status: 401, headers: getCorsHeaders() });
    }

    // Return the existing successful login response shape expected by the mobile app (text token)
    return new Response(token!, {
      status: 200,
      headers: { ...getCorsHeaders(), "content-type": "text/plain" },
    });
  }

  // 2. STEDI Forwarding
  const clonedReq = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bodyStr,
  });

  const stediResponse = await forwardRequest(clonedReq, "/login");

  // Add CORS headers to the response we're proxying
  const finalHeaders = new Headers(stediResponse.headers);
  const cors = getCorsHeaders();
  Object.keys(cors).forEach((key) => {
    finalHeaders.set(key, cors[key as keyof typeof cors]);
  });

  // For 200 OK or other responses from STEDI
  return new Response(stediResponse.body, {
    status: stediResponse.status,
    statusText: stediResponse.statusText,
    headers: finalHeaders,
  });
}
