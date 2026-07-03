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

  const upstreamRes = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const resContentType = upstreamRes.headers.get("content-type");
  const responseHeaders = new Headers();
  if (resContentType) {
    responseHeaders.set("content-type", resContentType);
  }

  if (resContentType && resContentType.includes("application/json")) {
    const json = await upstreamRes.json();
    return Response.json(json, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } else {
    const text = await upstreamRes.text();
    return new Response(text, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  }
}
