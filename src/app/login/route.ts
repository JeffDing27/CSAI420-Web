import { NextResponse } from "next/server";
import { forwardRequest } from "@/utils/pass-through";
import { kvGet } from "@/utils/kv-store";
import crypto from "crypto";

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
      { status: 400, headers: getCorsHeaders() }
    );
  }

  // 1. Local Fallback Mode
  if (process.env.USE_LOCAL_USER_STORE === "true") {
    const userName = payload.userName || payload.email;
    const password = payload.password;

    if (!userName || !password) {
      return new Response("Missing userName or password", { status: 400, headers: getCorsHeaders() });
    }

    const normalizedEmail = userName.trim().toLowerCase();
    const existingUser = await kvGet<any>(`user:${normalizedEmail}`);

    if (!existingUser || !existingUser.passwordSalt || !existingUser.passwordHash) {
      return new Response("Invalid credentials", { status: 401, headers: getCorsHeaders() });
    }

    const salt = existingUser.passwordSalt;
    const expectedHash = existingUser.passwordHash;

    const submittedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

    const expectedHashBuffer = Buffer.from(expectedHash, "hex");
    const submittedHashBuffer = Buffer.from(submittedHash, "hex");

    if (expectedHashBuffer.length !== submittedHashBuffer.length || !crypto.timingSafeEqual(expectedHashBuffer, submittedHashBuffer)) {
      return new Response("Invalid credentials", { status: 401, headers: getCorsHeaders() });
    }

    // Return the existing successful login response shape expected by the mobile app (text token)
    const token = crypto.randomUUID();
    return new Response(token, { status: 200, headers: { ...getCorsHeaders(), "content-type": "text/plain" } });
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
