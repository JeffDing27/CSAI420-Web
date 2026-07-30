import { afterEach, describe, expect, it } from "vitest";
import { GET as GetRecent } from "@/app/devices/updates/recent/route";
import { POST as PostSensorUpdate } from "@/app/sensorUpdates/route";
import { resetKvFallback } from "@/utils/kv-store";

describe("device status routes", () => {
  afterEach(() => {
    resetKvFallback();
  });

  it("stores heartbeats and returns recent devices", async () => {
    const response = await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "007",
          customer: "user@test.com",
          poweredOn: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Saved");

    const recentResponse = await GetRecent(
      new Request("http://localhost/devices/updates/recent?seconds=10"),
    );

    expect(recentResponse.status).toBe(200);
    const data = await recentResponse.json();
    expect(data.devices).toHaveLength(1);
    expect(data.devices[0]).toMatchObject({
      deviceId: "007",
      customer: "user@test.com",
      poweredOn: true,
    });
  });

  it("uses a safe default window when seconds is invalid", async () => {
    const recordedAt = Date.now();

    await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "123",
          customer: "user@test.com",
          poweredOn: true,
          recordedAt,
        }),
      }),
    );

    const recentResponse = await GetRecent(
      new Request("http://localhost/devices/updates/recent?seconds=abc"),
    );

    expect(recentResponse.status).toBe(200);
    const data = await recentResponse.json();
    expect(data.windowSeconds).toBe(10);
    expect(data.devices).toHaveLength(1);
  });

  it("uses the default window when seconds is omitted", async () => {
    await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "456",
          customer: "user@test.com",
          poweredOn: true,
          recordedAt: Date.now(),
        }),
      }),
    );

    const recentResponse = await GetRecent(
      new Request("http://localhost/devices/updates/recent"),
    );

    expect(recentResponse.status).toBe(200);
    const data = await recentResponse.json();
    expect(data.windowSeconds).toBe(10);
    expect(data.devices).toHaveLength(1);
    expect(data.devices[0].deviceId).toBe("456");
  });

  it("excludes stale heartbeats outside the requested window", async () => {
    await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "999",
          customer: "old@test.com",
          poweredOn: true,
          recordedAt: Date.now() - 15_000,
        }),
      }),
    );

    const recentResponse = await GetRecent(
      new Request("http://localhost/devices/updates/recent?seconds=5"),
    );

    expect(recentResponse.status).toBe(200);
    const data = await recentResponse.json();
    expect(data.devices).toHaveLength(0);
  });
});
