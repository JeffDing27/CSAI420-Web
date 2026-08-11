import { NextRequest, NextResponse } from "next/server";
import { RiskScoreService } from "@/services/risk-score.service";

const service = new RiskScoreService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> },
) {
  const { email } = await params;
  const token = request.headers.get("suresteps-session-token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing suresteps-session-token header" },
      { status: 401 },
    );
  }

  try {
    const upstreamResponse = await service.fetchRiskScore(email, token);
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
    console.error("Failed to fetch risk score:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
