import { NextResponse } from "next/server";

const POSSIBLE_TOKEN_HEADERS = [
  "x-suresteps-session-token",
  "authorization",
  "suresteps-session-token",
  "suresteps.session.token",
] as const;

function normalizeToken(headerName: string, value: string): string {
  if (
    headerName.toLowerCase() === "authorization" &&
    value.startsWith("Bearer ")
  ) {
    return value.substring(7).trim();
  }

  return value.trim();
}

/**
 * Finds the SureSteps session token in either:
 * 1. The normal incoming request headers, or
 * 2. Vercel's x-vercel-sc-headers metadata.
 */
export function getSessionToken(request: Request): string | null {
  // Check normal incoming headers first.
  for (const headerName of POSSIBLE_TOKEN_HEADERS) {
    const value = request.headers.get(headerName);

    if (value?.trim()) {
      return normalizeToken(headerName, value);
    }
  }

  // Check whether Vercel placed headers inside x-vercel-sc-headers.
  const secureHeadersValue = request.headers.get("x-vercel-sc-headers");

  if (!secureHeadersValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(secureHeadersValue) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const secureHeaders = parsed as Record<string, unknown>;

    for (const [headerName, rawValue] of Object.entries(secureHeaders)) {
      const normalizedHeaderName = headerName.toLowerCase();

      if (
        !POSSIBLE_TOKEN_HEADERS.includes(
          normalizedHeaderName as (typeof POSSIBLE_TOKEN_HEADERS)[number],
        )
      ) {
        continue;
      }

      if (typeof rawValue === "string" && rawValue.trim()) {
        return normalizeToken(normalizedHeaderName, rawValue);
      }

      // Support a possible array-based header representation.
      if (
        Array.isArray(rawValue) &&
        typeof rawValue[0] === "string" &&
        rawValue[0].trim()
      ) {
        return normalizeToken(normalizedHeaderName, rawValue[0]);
      }
    }
  } catch {
    console.error("[Auth] Unable to parse x-vercel-sc-headers");
  }

  return null;
}

export async function forwardRequest(request: Request, path: string) {
  const baseUrl = process.env.STEDI_API_BASE_URL || "https://dev.stedi.me";
  const url = `${baseUrl}${path}`;

  const incomingHeaderNames = Array.from(request.headers.keys());

  console.log(
    "[Pass-Through] Incoming header names:",
    incomingHeaderNames.join(", "),
  );

  const token = getSessionToken(request);

  console.log(
    `[Pass-Through] ${request.method} ${path} | hasSessionToken: ${Boolean(
      token,
    )}`,
  );

  const fetchHeaders: Record<string, string> = {};

  const contentType = request.headers.get("content-type");

  if (contentType) {
    fetchHeaders["content-type"] = contentType;
  }

  if (token) {
    fetchHeaders["suresteps.session.token"] = token;
  }

  let body: string | undefined;
  let parsedRequestBody: unknown = null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const rawBody = await request.text();

      if (rawBody) {
        body = rawBody;

        try {
          parsedRequestBody = JSON.parse(rawBody);
        } catch {
          // The request body does not have to be JSON.
        }
      }
    } catch (error) {
      console.error(
        `[Pass-Through] Failed to read request body for ${path}:`,
        error,
      );

      return new Response("Internal Server Error", {
        status: 500,
      });
    }
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(url, {
      method: request.method,
      headers: fetchHeaders,
      body,
    });
  } catch (error) {
    console.error(`[Pass-Through] Network error fetching ${url}:`, error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }

  let rawText = "";

  try {
    rawText = await upstreamResponse.text();

    if (path === "/login") {
      console.log(
        `[Pass-Through] Login upstream status: ${
          upstreamResponse.status
        } | bodyLength: ${rawText.length} | contentType: ${
          upstreamResponse.headers.get("content-type") ?? "none"
        }`,
      );
    }
  } catch (error) {
    console.error(`[Pass-Through] Failed to read response from ${url}:`, error);

    return new Response("Internal Server Error", {
      status: 500,
    });
  }

  if (!upstreamResponse.ok) {
    let logContext: Record<string, unknown> = {};

    if (
      parsedRequestBody &&
      typeof parsedRequestBody === "object" &&
      !Array.isArray(parsedRequestBody)
    ) {
      logContext = {
        ...(parsedRequestBody as Record<string, unknown>),
      };

      for (const key of Object.keys(logContext)) {
        const normalizedKey = key.toLowerCase();

        if (
          normalizedKey.includes("password") ||
          normalizedKey.includes("token") ||
          normalizedKey.includes("secret")
        ) {
          logContext[key] = "***REDACTED***";
        }
      }
    }

    if (path.startsWith("/riskscore/") && request.method === "GET") {
      logContext.email = path.replace("/riskscore/", "");
    }

    console.error(
      `[Pass-Through] Endpoint: ${path} | Method: ${
        request.method
      } | Upstream URL: ${url} | Status: ${upstreamResponse.status}`,
    );

    if (Object.keys(logContext).length > 0) {
      console.error(
        "[Pass-Through] Request Context:",
        JSON.stringify(logContext),
      );
    }

    // Avoid printing login responses because they may contain a token.
    if (path !== "/login") {
      console.error("[Pass-Through] Response Body:", rawText);
    }
  }

  // Handle the STEDI API's inconsistent duplicate-customer response.
  if (
    path === "/customer" &&
    request.method === "POST" &&
    upstreamResponse.status === 500 &&
    rawText.includes("500 Internal Server Error")
  ) {
    return new Response("Error creating customer", {
      status: 409,
    });
  }

  const responseHeaders = new Headers();
  const responseContentType = upstreamResponse.headers.get("content-type");

  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  if (!rawText) {
    return new Response(null, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  if (responseContentType?.includes("application/json")) {
    try {
      return NextResponse.json(JSON.parse(rawText), {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    } catch {
      return new Response(rawText, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }
  }

  return new Response(rawText, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
