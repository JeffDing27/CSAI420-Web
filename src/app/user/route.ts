import { NextResponse } from "next/server";
import { forwardRequest } from "@/utils/pass-through";
import { kvGet, kvSet } from "@/utils/kv-store";
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

  // 1. Validate Input
  const { userName, email, password, verifyPassword, birthDate, phone, region } = payload;
  
  if (!userName || typeof userName !== "string") {
    return NextResponse.json({ error: "Missing or invalid userName" }, { status: 400, headers: getCorsHeaders() });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Missing or invalid email" }, { status: 400, headers: getCorsHeaders() });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400, headers: getCorsHeaders() });
  }
  if (password !== verifyPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400, headers: getCorsHeaders() });
  }
  if (!birthDate || typeof birthDate !== "string") {
    return NextResponse.json({ error: "Missing or invalid birthDate" }, { status: 400, headers: getCorsHeaders() });
  }
  
  const normalizedEmail = email.trim().toLowerCase();

  // 2. Local Fallback Mode
  if (process.env.USE_LOCAL_USER_STORE === "true") {
    const existingUser = await kvGet(`user:${normalizedEmail}`);
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409, headers: getCorsHeaders() });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

    const sanitizedUser = {
      userName,
      email: normalizedEmail,
      birthDate,
      phone,
      region,
      passwordHash,
      passwordSalt: salt,
      agreedToTermsOfUseDate: payload.agreedToTermsOfUseDate,
      agreedToCookiePolicyDate: payload.agreedToCookiePolicyDate,
      agreedToPrivacyPolicyDate: payload.agreedToPrivacyPolicyDate,
      agreedToTextMessageDate: payload.agreedToTextMessageDate,
    };

    await kvSet(`user:${normalizedEmail}`, sanitizedUser);

    return NextResponse.json(
      { message: "User created successfully", email: normalizedEmail },
      { status: 200, headers: getCorsHeaders() }
    );
  }

  // 3. STEDI Forwarding
  const clonedReq = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bodyStr,
  });

  const stediResponse = await forwardRequest(clonedReq, "/user");

  // Add CORS headers to the response we're proxying
  const finalHeaders = new Headers(stediResponse.headers);
  const cors = getCorsHeaders();
  Object.keys(cors).forEach(key => {
    finalHeaders.set(key, cors[key as keyof typeof cors]);
  });

  // Handle upstream STEDI errors
  if (stediResponse.status === 500) {
    // We don't know exactly if it's 409 or 502, but STEDI returns 500 for most failures.
    // The instructions say: "502 when the external STEDI service fails instead of a generic internal 500."
    // However, if we parse it and it says "already exists" we could do 409, but let's default to 502.
    // We already check in pass-through for "Error creating customer" giving 409, maybe we do the same?
    const responseText = await stediResponse.text();
    if (responseText.toLowerCase().includes("exists") || responseText.toLowerCase().includes("duplicate")) {
      return new Response("User already exists", { status: 409, headers: finalHeaders });
    }
    
    return new Response("Upstream service unavailable", { status: 502, headers: finalHeaders });
  }
  
  if (stediResponse.status === 409) {
    return new Response("User already exists", { status: 409, headers: finalHeaders });
  }

  // For 200 OK or other responses from STEDI
  // To attach headers to an existing Response, we recreate it:
  return new Response(stediResponse.body, {
    status: stediResponse.status,
    statusText: stediResponse.statusText,
    headers: finalHeaders,
  });
}
