import { RapidStepTestService } from "@/services/rapid-step-test.service";
import { RepositoryFactory } from "@/repositories/provider-factory";
import { NextResponse } from "next/server";

const service = new RapidStepTestService();
const userRepo = RepositoryFactory.getUserRepository();

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Try to identify the user
    // The payload usually has 'customer' (email or phone)
    const customer = data.customer;
    if (!customer) {
      return new Response("Missing customer", { status: 400 });
    }

    // Find user
    let user = await userRepo.findByEmail(customer);
    if (!user) {
      user = await userRepo.findByPhone(customer);
    }
    if (!user) {
      user = await userRepo.findByUsername(customer);
    }

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Submit test
    await service.submitTest({
      userId: user.id,
      externalTestId: data.testId || data.id || null,
      testData: data,
      source: data.source || "EXTERNAL",
      completedAt: new Date(),
    });

    return new Response("Saved", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  } catch (error) {
    console.error("Failed to process rapid step test:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
