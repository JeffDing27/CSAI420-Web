import { NextResponse } from "next/server";

export async function forwardRequest(request: Request, path: string) {
  const baseUrl = process.env.STEDI_API_BASE_URL || "https://dev.stedi.me";
  const url = `${baseUrl}${path}`;

  const incomingHeaderNames = Array.from(request.headers.keys());
  console.log(
    `[Pass-Through] Incoming header names:`,
    incomingHeaderNames.join(", "),
  );
  const vercelSecureHeaders = request.headers.get("x-vercel-sc-headers");

  if (vercelSecureHeaders) {
    try {
      const parsedSecureHeaders = JSON.parse(vercelSecureHeaders);

      console.log(
        "[Pass-Through] x-vercel-sc-headers names:",
        Object.keys(parsedSecureHeaders).join(", "),
      );
    } catch {
      console.log("[Pass-Through] Unable to parse x-vercel-sc-headers");
    }
  }

  const possibleTokenHeaders = [
    "x-suresteps-session-token",
    "authorization",
    "suresteps-session-token",
    "suresteps.session.token",
  ];

  let token: string | null = null;
  let detectedSessionHeaderName = "none";

  for (const headerName of possibleTokenHeaders) {
    const val = request.headers.get(headerName);
    if (val) {
      token =
        headerName.toLowerCase() === "authorization" &&
        val.startsWith("Bearer ")
          ? val.substring(7)
          : val;
      detectedSessionHeaderName = headerName;
      break;
    }
  }

  // Safe logging for session token
  console.log(
    `[Pass-Through] ${request.method} ${path} | hasSessionToken: ${!!token} | detectedSessionHeaderName: ${detectedSessionHeaderName}`,
  );

  const fetchHeaders: Record<string, string> = {};

  const contentType = request.headers.get("content-type");
  if (contentType) {
    fetchHeaders["content-type"] = contentType;
  }

  if (token) {
    fetchHeaders["suresteps.session.token"] = token;
  }

  let body: string | undefined = undefined;
  let parsedReqBody: any = null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const rawBody = await request.text();
      if (rawBody) {
        body = rawBody;
        try {
          parsedReqBody = JSON.parse(rawBody);
        } catch (e) {
          // Ignore JSON parse errors for request body
        }
      }
    } catch (error) {
      console.error(
        `[Pass-Through] Failed to read request body for ${path}:`,
        error,
      );
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url, {
      method: request.method,
      headers: fetchHeaders,
      body,
    });
  } catch (error) {
    console.error(
      `[Pass-Through] Network/proxy error fetching upstream ${url}:`,
      error,
    );
    return new Response("Internal Server Error", { status: 500 });
  }

  let rawText = "";
  try {
    rawText = await upstreamRes.text();
    if (path === "/login") {
      console.log(
        `[Pass-Through] Login upstream status: ${upstreamRes.status} | bodyLength: ${rawText.length} | contentType: ${upstreamRes.headers.get("content-type")}`,
      );
    }
  } catch (error) {
    console.error(
      `[Pass-Through] Failed to read upstream response body for ${url}:`,
      error,
    );
    return new Response("Internal Server Error", { status: 500 });
  }

  if (!upstreamRes.ok) {
    let logContext: any = {};
    if (parsedReqBody) {
      logContext = { ...parsedReqBody };
      for (const key of Object.keys(logContext)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("token") ||
          lowerKey.includes("secret")
        ) {
          logContext[key] = "***REDACTED***";
        }
      }
    }

    if (path.startsWith("/riskscore/") && request.method === "GET") {
      logContext.email = path.replace("/riskscore/", "");
    }

    console.error(
      `[Pass-Through] Endpoint: ${path} | Method: ${request.method} | Upstream URL: ${url} | Status: ${upstreamRes.status}`,
    );
    if (Object.keys(logContext).length > 0) {
      console.error(
        `[Pass-Through] Request Context:`,
        JSON.stringify(logContext),
      );
    }
    console.error(`[Pass-Through] Response Body:`, rawText);
  }

  // Handle STEDI API inconsistency on customer creation
  if (
    path === "/customer" &&
    request.method === "POST" &&
    upstreamRes.status === 500 &&
    rawText &&
    rawText.includes("500 Internal Server Error")
  ) {
    return new Response("Error creating customer", { status: 409 });
  }

  const resContentType = upstreamRes.headers.get("content-type");
  const responseHeaders = new Headers();
  if (resContentType) {
    responseHeaders.set("content-type", resContentType);
  }

  if (!rawText) {
    return new Response(null, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  }

  if (resContentType && resContentType.includes("application/json")) {
    try {
      const parsedBody = JSON.parse(rawText);
      return NextResponse.json(parsedBody, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    } catch (e) {
      // JSON parse failed despite content-type, fallback to raw text
      return new Response(rawText, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }
  }

  return new Response(rawText, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}
