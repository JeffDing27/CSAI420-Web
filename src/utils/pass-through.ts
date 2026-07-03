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
  if (request.method !== "GET" && request.method !== "HEAD") {
    const rawBody = await request.text();
    if (rawBody) {
      body = rawBody;
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
    console.error(`[Pass-Through Error] Failed to fetch upstream ${url}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }

  const resContentType = upstreamRes.headers.get("content-type");
  const responseHeaders = new Headers();
  if (resContentType) {
    responseHeaders.set("content-type", resContentType);
  }

  const rawText = await upstreamRes.text();

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
