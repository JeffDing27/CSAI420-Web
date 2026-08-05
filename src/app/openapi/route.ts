import { buildOpenApiSpec } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const spec = await buildOpenApiSpec();
    return Response.json(spec, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to generate OpenAPI specification" },
      { status: 500 },
    );
  }
}
