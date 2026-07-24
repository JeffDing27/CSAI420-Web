import { describe, expect, it, vi } from "vitest";
import {
  normalizeBaseUrl,
  sendHeartbeat,
  sendRapidStepTest,
} from "./src/client.js";

describe("emulator client base URL normalization", () => {
  it("keeps localhost for host-run development", () => {
    expect(
      normalizeBaseUrl("http://localhost:3000", { isDockerRuntime: false }),
    ).toBe("http://localhost:3000");
  });

  it("rewrites localhost to the Docker host alias inside containers", () => {
    expect(
      normalizeBaseUrl("http://localhost:3000", { isDockerRuntime: true }),
    ).toBe("http://host.docker.internal:3000");
  });

  it("rewrites 127.0.0.1 to the Docker host alias inside containers", () => {
    expect(
      normalizeBaseUrl("http://127.0.0.1:3000", { isDockerRuntime: true }),
    ).toBe("http://host.docker.internal:3000");
  });
});

describe("emulator client", () => {
  it("posts heartbeats to /sensorUpdates with the session token header", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("Saved", { status: 200 }));

    const result = await sendHeartbeat(
      {
        customer: "user@test.com",
        deviceId: "007",
        powerState: "on",
        sessionToken: "token-123",
        targetBaseUrl: "https://stedi-voice.vercel.app",
      },
      {
        fetchImpl,
        now: 1_700_000_000_000,
      },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://stedi-voice.vercel.app/sensorUpdates");
    expect(init.headers["suresteps.session.token"]).toBe("token-123");
    expect(JSON.parse(init.body)).toMatchObject({
      customer: "user@test.com",
      deviceId: "007",
      poweredOn: true,
      recordedAt: 1_700_000_000_000,
    });
    expect(result.status).toBe(200);
    expect(result.body).toBe("Saved");
  });

  it("posts randomized rapid-step payloads to /rapidsteptest", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("Saved", { status: 200 }));

    const result = await sendRapidStepTest(
      {
        customer: "user@test.com",
        deviceId: "007",
        sessionToken: "token-123",
        targetBaseUrl: "https://stedi-voice.vercel.app",
      },
      {
        fetchImpl,
        now: 1_700_000_000_000,
        random: () => 0.5,
      },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://stedi-voice.vercel.app/rapidsteptest");
    expect(init.headers["suresteps.session.token"]).toBe("token-123");
    const payload = JSON.parse(init.body);
    expect(payload.customer).toBe("user@test.com");
    expect(payload.deviceId).toBe("007");
    expect(payload.testTime).toBe(payload.stopTime - payload.startTime);
    expect(payload.totalSteps).toBe(payload.stepPoints.length);
    expect(result.status).toBe(200);
    expect(result.body).toBe("Saved");
  });

  it("uses the Docker host alias when localhost is configured inside a container", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("Saved", { status: 200 }));

    await sendRapidStepTest(
      {
        customer: "user@test.com",
        deviceId: "007",
        sessionToken: "token-123",
        targetBaseUrl: "http://localhost:3000",
      },
      {
        fetchImpl,
        isDockerRuntime: true,
        now: 1_700_000_000_000,
        random: () => 0.5,
      },
    );

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://host.docker.internal:3000/rapidsteptest");
  });
});
