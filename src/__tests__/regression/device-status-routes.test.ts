import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { GET as GetRecent } from "@/app/devices/updates/recent/route";
import { POST as PostSensorUpdate } from "@/app/sensorUpdates/route";
import { resetKvFallback } from "@/utils/kv-store";
import { DeviceService } from "@/services/device.service";
import { DeviceStatus } from "@prisma/client";

vi.mock("@/services/device.service", () => ({
  DeviceService: {
    authenticateDevice: vi.fn(),
    recordHeartbeat: vi.fn(),
  }
}));

describe("device status routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetKvFallback();
  });

  function setupAuthSuccess(deviceId = "STEDI-007") {
    (DeviceService.authenticateDevice as any).mockResolvedValue({
      id: "device-record-id",
      deviceId,
      status: DeviceStatus.ASSIGNED
    });
  }

  it("stores authenticated heartbeats and returns recent devices", async () => {
    setupAuthSuccess("STEDI-007");

    const response = await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-stedi-device-id": "STEDI-007",
          "x-stedi-device-token": "valid-token"
        },
        body: JSON.stringify({
          deviceId: "STEDI-007",
          customer: "spoofed@test.com",
          poweredOn: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Saved");
    expect(DeviceService.recordHeartbeat).toHaveBeenCalled();

    const recentResponse = await GetRecent(
      new Request("http://localhost/devices/updates/recent?seconds=10"),
    );

    expect(recentResponse.status).toBe(200);
    const data = await recentResponse.json();
    expect(data.devices).toHaveLength(1);
    expect(data.devices[0]).toMatchObject({
      deviceId: "STEDI-007",
      customer: null, // customer is ignored from body
      poweredOn: true,
    });
  });

  it("rejects unauthenticated heartbeats", async () => {
    const response = await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "007" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    (DeviceService.authenticateDevice as any).mockRejectedValue(new Error('Invalid device credentials'));
    const response = await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-stedi-device-id": "007",
          "x-stedi-device-token": "bad-token"
        },
        body: JSON.stringify({ deviceId: "007" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects body/header mismatch", async () => {
    setupAuthSuccess("STEDI-007");
    const response = await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-stedi-device-id": "STEDI-007",
          "x-stedi-device-token": "valid-token"
        },
        body: JSON.stringify({ deviceId: "HACKER-1" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects retired device", async () => {
    (DeviceService.authenticateDevice as any).mockRejectedValue(new Error('Device is retired'));
    const response = await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-stedi-device-id": "STEDI-007",
          "x-stedi-device-token": "valid-token"
        },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(409);
  });

  it("accepts heartbeat from provisioned but unassigned device", async () => {
    (DeviceService.authenticateDevice as any).mockResolvedValue({
      id: "device-record-id",
      deviceId: "STEDI-008",
      status: DeviceStatus.UNASSIGNED
    });

    const response = await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-stedi-device-id": "STEDI-008",
          "x-stedi-device-token": "valid-token"
        },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("uses a safe default window when seconds is invalid", async () => {
    setupAuthSuccess("123");
    const recordedAt = Date.now();

    await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-stedi-device-id": "123",
          "x-stedi-device-token": "valid"
        },
        body: JSON.stringify({
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

  it("excludes stale heartbeats outside the requested window", async () => {
    setupAuthSuccess("999");
    await PostSensorUpdate(
      new Request("http://localhost/sensorUpdates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-stedi-device-id": "999",
          "x-stedi-device-token": "valid"
        },
        body: JSON.stringify({
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
