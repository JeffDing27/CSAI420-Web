import { describe, expect, it, vi } from "vitest";
import { findMissingStepConfig, parseCommand, runCli } from "./src/cli.js";

function createOutputCapture() {
  let stdout = "";
  let stderr = "";

  return {
    output: {
      stderr: {
        write(value) {
          stderr += value;
        },
      },
      stdout: {
        write(value) {
          stdout += value;
        },
      },
    },
    read() {
      return { stderr, stdout };
    },
  };
}

describe("CLI parsing", () => {
  it("parses set-device-id", () => {
    expect(parseCommand(["set-device-id", "007"])).toEqual({
      key: "deviceId",
      type: "set",
      value: "007",
    });
  });

  it("parses nested set commands", () => {
    expect(parseCommand(["set", "customer", "user@test.com"])).toEqual({
      key: "customer",
      type: "set",
      value: "user@test.com",
    });
  });
});

describe("CLI execution", () => {
  it("sends config updates through the control API", async () => {
    const capture = createOutputCapture();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ customer: "user@test.com" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const exitCode = await runCli(["set", "customer", "user@test.com"], {
      fetchImpl,
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const { stdout } = capture.read();
    expect(stdout).toContain("customer=user@test.com");
  });

  it("reports missing configuration before send-steps", async () => {
    const capture = createOutputCapture();

    const exitCode = await runCli(["send-steps"], {
      output: capture.output,
      readStateFn: async () => ({
        customer: null,
        deviceId: null,
        sessionToken: null,
      }),
    });

    expect(exitCode).toBe(1);
    const { stderr } = capture.read();
    expect(stderr).toContain("deviceId");
    expect(stderr).toContain("customer");
    expect(stderr).toContain("sessionToken");
  });

  it("succeeds when send-steps returns a 2xx response", async () => {
    const capture = createOutputCapture();
    const sendRapidStepTestFn = vi.fn().mockResolvedValue({
      body: "Saved",
      status: 200,
    });

    const exitCode = await runCli(["send-steps"], {
      output: capture.output,
      readStateFn: async () => ({
        customer: "user@test.com",
        deviceId: "007",
        sessionToken: "token-123",
        targetBaseUrl: "https://stedi-voice.vercel.app",
      }),
      sendRapidStepTestFn,
    });

    expect(exitCode).toBe(0);
    expect(sendRapidStepTestFn).toHaveBeenCalledOnce();
    const { stdout } = capture.read();
    expect(stdout).toContain("status=200");
    expect(stdout).toContain("Saved");
  });

  it("returns non-zero and prints the upstream failure body on non-2xx responses", async () => {
    const capture = createOutputCapture();
    const sendRapidStepTestFn = vi.fn().mockResolvedValue({
      body: "Upstream exploded",
      status: 500,
    });

    const exitCode = await runCli(["send-steps"], {
      output: capture.output,
      readStateFn: async () => ({
        customer: "user@test.com",
        deviceId: "007",
        sessionToken: "token-123",
        targetBaseUrl: "https://stedi-voice.vercel.app",
      }),
      sendRapidStepTestFn,
    });

    expect(exitCode).toBe(1);
    const { stdout } = capture.read();
    expect(stdout).toContain("status=500");
    expect(stdout).toContain("Upstream exploded");
  });
});

describe("CLI config validation", () => {
  it("finds missing send-steps config fields", () => {
    expect(
      findMissingStepConfig({
        customer: null,
        deviceId: "007",
        sessionToken: null,
      }),
    ).toEqual(["customer", "sessionToken"]);
  });
});
