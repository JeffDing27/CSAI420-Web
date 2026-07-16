import { describe, expect, it } from "vitest";
import { POST as Ask } from "@/app/api/voice/ask/route";
import { POST as Auth } from "@/app/api/voice/auth/route";
import { POST as Incoming } from "@/app/api/voice/incoming/route";

describe("Week 7: Voice IVR", () => {
  it("POST /api/voice/incoming returns initial gather TwiML", async () => {
    const res = await Incoming(
      new Request("http://localhost/api/voice/incoming", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/xml");

    const text = await res.text();
    expect(text).toContain("Welcome to the STEDI Mobility Coach");
    expect(text).toContain(
      '<Gather input="speech dtmf" action="/api/voice/auth"',
    );
  });

  it("POST /api/voice/auth verifies phone number", async () => {
    // Digits sent
    const req = new Request("http://localhost/api/voice/auth", {
      method: "POST",
      body: "Digits=1234567890",
    });

    const res = await Auth(req);
    const text = await res.text();
    expect(text).toContain("Your account is verified");
    expect(text).toContain('action="/api/voice/ask"');
  });

  it("POST /api/voice/auth handles invalid input", async () => {
    const req = new Request("http://localhost/api/voice/auth", {
      method: "POST",
      body: "Digits=123",
    });

    const res = await Auth(req);
    const text = await res.text();
    expect(text).toContain("could not verify that number");
    expect(text).toContain("<Redirect>/api/voice/incoming</Redirect>");
  });

  it("POST /api/voice/ask handles normal questions", async () => {
    const req = new Request("http://localhost/api/voice/ask", {
      method: "POST",
      body: "SpeechResult=How do I do this?",
    });

    const res = await Ask(req);
    const text = await res.text();
    expect(text).toContain("I heard your question");
  });

  it("POST /api/voice/ask handles escalations", async () => {
    const req = new Request("http://localhost/api/voice/ask", {
      method: "POST",
      body: "SpeechResult=I am in pain",
    });

    const res = await Ask(req);
    const text = await res.text();
    expect(text).toContain("escalating this to a human medical coach");
  });
});
