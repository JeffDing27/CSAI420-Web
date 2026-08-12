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

type RouteParams = { phone: string };
type Context = { params: Promise<RouteParams> | RouteParams };

async function resolveParams(params: Promise<RouteParams> | RouteParams) {
  if (typeof (params as Promise<RouteParams>).then === "function") {
    return await (params as Promise<RouteParams>);
  }
  return params as RouteParams;
}

export async function GET(request: Request, context: Context) {
  const { phone } = await resolveParams(context.params);
  const normalizedPhone = decodeURIComponent(phone).trim();

  if (!normalizedPhone) {
    return new Response(JSON.stringify({ error: "Invalid phone" }), {
      status: 400,
      headers: {
        ...getCorsHeaders(),
        "Content-Type": "application/json",
      },
    });
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("accept", "application/json");

  const proxiedRequest = new Request(request.url, {
    method: "GET",
    headers: forwardedHeaders,
  });

  const upstreamResponse = await forwardRequest(
    proxiedRequest,
    `/customer/${encodeURIComponent(normalizedPhone)}`,
  );

  const finalHeaders = new Headers(upstreamResponse.headers);
  Object.entries(getCorsHeaders()).forEach(([k, v]) => finalHeaders.set(k, v));

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: finalHeaders,
  });
}