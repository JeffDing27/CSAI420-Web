import { getAuthToken } from "@/utils/auth";

const STEDI_BASE_URL = process.env.STEDI_API_BASE_URL || "https://dev.stedi.me";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (!body) {
      return new Response("Missing request body", { status: 400 });
    }

    const token = getAuthToken(request);
    const upstreamHeaders = new Headers({
      accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      "content-type": "application/json",
    });

    if (token) {
      upstreamHeaders.set("suresteps.session.token", token);
    }

    const upstreamResponse = await fetch(`${STEDI_BASE_URL}/rapidsteptest`, {
      method: "POST",
      headers: upstreamHeaders,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Failed to bridge rapidsteptest request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
