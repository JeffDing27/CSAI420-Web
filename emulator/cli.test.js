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
    expect(parseCommand(["set", "device-token", "my-token"])).toEqual({
      key: "deviceToken",
      type: "set",
      value: "my-token",
    });
  });

  it("parses provision", () => {
    expect(parseCommand(["provision", "007"])).toEqual({
      type: "provision",
      deviceId: "007"
    });
  });
});

describe("CLI execution", () => {
  it("sends config updates through the control API and redacts token", async () => {
    const capture = createOutputCapture();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ deviceToken: "my-token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const exitCode = await runCli(["set", "device-token", "my-token"], {
      fetchImpl,
      output: capture.output,
    });

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const { stdout } = capture.read();
    expect(stdout).toContain("deviceToken=configured");
    expect(stdout).not.toContain("my-token");
  });

  it("reports missing configuration before send-steps", async () => {
    const capture = createOutputCapture();

    const exitCode = await runCli(["send-steps"], {
      output: capture.output,
      readStateFn: async () => ({
        deviceId: null,
        deviceToken: null,
      }),
    });

    expect(exitCode).toBe(1);
    const { stderr } = capture.read();
    expect(stderr).toContain("deviceId");
    expect(stderr).toContain("deviceToken");
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
        deviceId: "007",
        deviceToken: "token-123",
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
        deviceId: "007",
        deviceToken: "token-123",
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
        deviceId: "007",
        deviceToken: null,
      }),
    ).toEqual(["deviceToken"]);
  });
});
