import { NextResponse } from "next/server";

const DIRECT_TOKEN_HEADERS = [
  "suresteps.session.token",
  "suresteps-session-token",
  "x-suresteps-session-token",
  "authorization",
] as const;

const VERCEL_SECURE_TOKEN_HEADERS = [
  "suresteps.session.token",
  "suresteps-session-token",
  "x-suresteps-session-token",
] as const;

function normalizeToken(headerName: string, value: string): string {
  const trimmedValue = value.trim();

  if (
    headerName.toLowerCase() === "authorization" &&
    trimmedValue.toLowerCase().startsWith("bearer ")
  ) {
    return trimmedValue.substring(7).trim();
  }

  return trimmedValue;
}

export function getSessionToken(request: Request): string | null {
  // Normal request headers may legitimately use Authorization.
  for (const headerName of DIRECT_TOKEN_HEADERS) {
    const value = request.headers.get(headerName);

    if (value?.trim()) {
      return normalizeToken(headerName, value);
    }
  }

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

    for (const [name, rawValue] of Object.entries(secureHeaders)) {
      const normalizedName = name.toLowerCase();

      // Important:
      // Do not accept "authorization" from x-vercel-sc-headers.
      // Vercel may put its own internal authorization data there.
      if (
        !VERCEL_SECURE_TOKEN_HEADERS.includes(
          normalizedName as (typeof VERCEL_SECURE_TOKEN_HEADERS)[number],
        )
      ) {
        continue;
      }

      if (typeof rawValue === "string" && rawValue.trim()) {
        return normalizeToken(normalizedName, rawValue);
      }

      if (
        Array.isArray(rawValue) &&
        typeof rawValue[0] === "string" &&
        rawValue[0].trim()
      ) {
        return normalizeToken(normalizedName, rawValue[0]);
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
