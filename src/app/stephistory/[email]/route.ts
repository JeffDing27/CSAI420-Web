import { forwardRequest } from "@/utils/pass-through";

const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, accept, suresteps.session.token",
});

export async function OPTIONS() {
  return new Response(null, { headers: getCorsHeaders() });
}

type RouteParams = { email: string };
type Context = { params: Promise<RouteParams> | RouteParams };

async function resolveParams(params: Promise<RouteParams> | RouteParams) {
  if (typeof (params as Promise<RouteParams>).then === "function") {
    return await (params as Promise<RouteParams>);
  }
  return params as RouteParams;
}

export async function GET(request: Request, context: Context) {
  const { email } = await resolveParams(context.params);
  const normalizedEmail = decodeURIComponent(email).trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: {
        ...getCorsHeaders(),
        "Content-Type": "application/json",
      },
    });
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("accept", "application/json");

  const surestepsToken = request.headers.get("suresteps.session.token");
  if (surestepsToken) {
    forwardedHeaders.set("suresteps.session.token", surestepsToken);
  }

  const proxiedRequest = new Request(request.url, {
    method: "GET",
    headers: forwardedHeaders,
  });

  const upstreamResponse = await forwardRequest(
    proxiedRequest,
    `/stephistory/${encodeURIComponent(normalizedEmail)}`,
  );

  const finalHeaders = new Headers(upstreamResponse.headers);
  Object.entries(getCorsHeaders()).forEach(([k, v]) => finalHeaders.set(k, v));

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: finalHeaders,
  });
}