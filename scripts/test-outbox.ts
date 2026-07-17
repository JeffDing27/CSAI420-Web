import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Creating test Outbox event...");
  await prisma.outboxEvent.create({
    data: {
      eventType: "TEST_OUTBOX_EVENT",
      payload: { testing: true },
      status: "PENDING",
      availableAt: new Date(),
    }
  });
  console.log("Created outbox event.");

  console.log("Invoking Next.js route (assuming server is not running, we'll just test the DB directly)...");
  
  // Since we want to verify the script or Next.js route, let's just trigger the processing logic manually here.
  // Actually, we can fetch the local API route if the Next.js server is running, or we can just import the logic.
  // We'll just call the POST method handler from the route.
  
  const { POST } = await import("../src/app/api/internal/process-outbox/route");
  
  // Mock request
  const req = new Request("http://localhost:3000/api/internal/process-outbox", {
    method: "POST"
  });
  
  const res = await POST(req);
  const data = await res.json();
  console.log("Outbox route response:", data);
  
  if (data.processed > 0) {
    console.log("SUCCESS: Outbox processor successfully processed pending rows.");
  } else {
    console.log("FAILED: No rows were processed.");
    process.exit(1);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
