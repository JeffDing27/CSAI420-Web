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
    expect(text).toContain('<Gather input="speech dtmf" action="/api/voice/auth"');
  });

  it("POST /api/voice/auth verifies phone number", async () => {
    const req = new Request("http://localhost/api/voice/auth", {
      method: "POST",
      body: "Digits=1234567890",
    });
    const text = await (await Auth(req)).text();
    expect(text).toContain("Your account is verified");
    expect(text).toContain('action="/api/voice/ask"');
  });

  it("POST /api/voice/auth handles invalid input", async () => {
    const req = new Request("http://localhost/api/voice/auth", {
      method: "POST",
      body: "Digits=123",
    });
    const text = await (await Auth(req)).text();
    expect(text).toContain("could not verify that number");
    expect(text).toContain("<Redirect>/api/voice/incoming</Redirect>");
  });

  it("answers sit-to-stand questions with specific guidance", async () => {
    const req = new Request("http://localhost/api/voice/ask", {
      method: "POST",
      body: "SpeechResult=How do I do the sit to stand exercise?",
    });
    const text = await (await Ask(req)).text();
    expect(text).toContain("use a stable chair");
    expect(text).toContain("Say yes or no");
  });

  it("provides honest safety guidance for pain", async () => {
    const req = new Request("http://localhost/api/voice/ask", {
      method: "POST",
      body: "SpeechResult=I am in pain",
    });
    const text = await (await Ask(req)).text();
    expect(text).toContain("Stop the exercise");
    expect(text).toContain("cannot contact a medical coach yet");
  });

  it("ends the call when the caller says no", async () => {
    const req = new Request("http://localhost/api/voice/ask", {
      method: "POST",
      body: "SpeechResult=No thank you",
    });
    const text = await (await Ask(req)).text();
    expect(text).toContain("Thank you for calling STEDI Voice");
    expect(text).toContain("<Hangup");
    expect(text).not.toContain("Do you have another question");
  });

  it("prompts for another question when the caller says yes", async () => {
    const req = new Request("http://localhost/api/voice/ask", {
      method: "POST",
      body: "SpeechResult=Yes",
    });
    const text = await (await Ask(req)).text();
    expect(text).toContain("What else would you like to know");
  });

  it("explains unavailable score retrieval accurately", async () => {
    const req = new Request("http://localhost/api/voice/ask", {
      method: "POST",
      body: "SpeechResult=What is my balance score?",
    });
    const text = await (await Ask(req)).text();
    expect(text).toContain("score retrieval is not connected");
  });
});
