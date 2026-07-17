import { NextResponse } from "next/server";
import { RiskScoreService } from "@/services/risk-score.service";

const service = new RiskScoreService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const { email } = await params;

  try {
    const score = await service.calculateRiskScore(email);
    return NextResponse.json({ score }, { status: 200 });
  } catch (error) {
    console.error("Failed to calculate risk score:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
