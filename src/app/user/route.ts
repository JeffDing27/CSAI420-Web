import { NextResponse } from "next/server";
import { forwardRequest } from "@/utils/pass-through";

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

  // 1. Validate Input
  const {
    userName,
    email,
    password,
    verifyPassword,
    birthDate,
    phone,
    region,
  } = payload;

  if (!userName || typeof userName !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid userName" },
      { status: 400, headers: getCorsHeaders() },
    );
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: "Missing or invalid email" },
      { status: 400, headers: getCorsHeaders() },
    );
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400, headers: getCorsHeaders() },
    );
  }
  if (password !== verifyPassword) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400, headers: getCorsHeaders() },
    );
  }
  if (!birthDate || typeof birthDate !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid birthDate" },
      { status: 400, headers: getCorsHeaders() },
    );
  }

  // 2. STEDI Forwarding
  const clonedReq = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bodyStr,
  });

  const stediResponse = await forwardRequest(clonedReq, "/user");

  // Add CORS headers to the response we're proxying
  const finalHeaders = new Headers(stediResponse.headers);
  const cors = getCorsHeaders();
  Object.keys(cors).forEach((key) => {
    finalHeaders.set(key, cors[key as keyof typeof cors]);
  });

  if (stediResponse.status === 500) {
    const responseText = await stediResponse.text();
    if (
      responseText.toLowerCase().includes("exists") ||
      responseText.toLowerCase().includes("duplicate")
    ) {
      return new Response("User already exists", {
        status: 409,
        headers: finalHeaders,
      });
    }

    return new Response("Upstream service unavailable", {
      status: 502,
      headers: finalHeaders,
    });
  }

  if (stediResponse.status === 409) {
    return new Response("User already exists", {
      status: 409,
      headers: finalHeaders,
    });
  }

  return new Response(stediResponse.body, {
    status: stediResponse.status,
    statusText: stediResponse.statusText,
    headers: finalHeaders,
  });
}
