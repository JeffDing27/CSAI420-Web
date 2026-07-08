import { NextResponse } from "next/server";

export async function forwardRequest(request: Request, path: string) {
  const baseUrl = process.env.STEDI_API_BASE_URL || "https://dev.stedi.me";
  const url = `${baseUrl}${path}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const token = request.headers.get("suresteps.session.token");
  if (token) {
    headers.set("suresteps.session.token", token);
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
      console.error(`[Pass-Through] Failed to read request body for ${path}:`, error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url, {
      method: request.method,
      headers,
      body,
    });
  } catch (error) {
    console.error(`[Pass-Through] Network/proxy error fetching upstream ${url}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }

  let rawText = "";
  try {
    rawText = await upstreamRes.text();
  } catch (error) {
    console.error(`[Pass-Through] Failed to read upstream response body for ${url}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }

  if (!upstreamRes.ok) {
    let logContext: any = {};
    if (parsedReqBody) {
      logContext = { ...parsedReqBody };
      for (const key of Object.keys(logContext)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("password") || lowerKey.includes("token") || lowerKey.includes("secret")) {
          logContext[key] = "***REDACTED***";
        }
      }
    }
    
    if (path.startsWith("/riskscore/") && request.method === "GET") {
      logContext.email = path.replace("/riskscore/", "");
    }

    console.error(`[Pass-Through] Endpoint: ${path} | Method: ${request.method} | Upstream URL: ${url} | Status: ${upstreamRes.status}`);
    if (Object.keys(logContext).length > 0) {
      console.error(`[Pass-Through] Request Context:`, JSON.stringify(logContext));
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
