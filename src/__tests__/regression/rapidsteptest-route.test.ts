import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/rapidsteptest/route";
import * as passThrough from "@/utils/pass-through";

vi.mock("@/utils/pass-through", () => ({
  forwardRequest: vi.fn(),
}));

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/rapidsteptest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /rapidsteptest", () => {
  it("forwards upstream success responses", async () => {
    vi.mocked(passThrough.forwardRequest).mockResolvedValueOnce(
      new Response("Saved", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    const request = createRequest({ customer: "user@test.com" });
    const response = await POST(request);

    expect(passThrough.forwardRequest).toHaveBeenCalledWith(
      request,
      "/rapidsteptest",
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Saved");
  });

  it("preserves upstream failure responses", async () => {
    vi.mocked(passThrough.forwardRequest).mockResolvedValueOnce(
      new Response("Internal Server Error", {
        status: 500,
        headers: { "content-type": "text/plain" },
      }),
    );

    const response = await POST(createRequest({ customer: "user@test.com" }));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal Server Error");
  });
});
