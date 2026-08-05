import { describe, expect, it } from "vitest";
import { buildRapidStepPayload } from "./src/rapid-step-payload.js";

function createSequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

describe("buildRapidStepPayload", () => {
  it("preserves identity fields and timing invariants", () => {
    const payload = buildRapidStepPayload(
      {
        customer: "user@test.com",
        deviceId: "007",
      },
      {
        now: 1_700_000_000_000,
        random: createSequenceRandom([0.25]),
      },
    );

    expect(payload.customer).toBe("user@test.com");
    expect(payload.deviceId).toBe("007");
    expect(payload.startTime).toBeLessThan(payload.stopTime);
    expect(payload.testTime).toBe(payload.stopTime - payload.startTime);
    expect(payload.totalSteps).toBe(payload.stepPoints.length);
  });

  it("keeps step values within realistic positive bounds", () => {
    const payload = buildRapidStepPayload(
      {
        customer: "user@test.com",
        deviceId: "007",
      },
      {
        now: 1_700_000_000_000,
        random: createSequenceRandom([0.99]),
      },
    );

    expect(payload.stepPoints).toHaveLength(30);
    expect(payload.stepPoints.every((value) => value > 0)).toBe(true);
    expect(Math.min(...payload.stepPoints)).toBeGreaterThanOrEqual(50);
    expect(payload.testTime).toBeGreaterThanOrEqual(9000);
    expect(payload.testTime).toBeLessThanOrEqual(16000);
  });

  it("varies timings and step values across different random inputs", () => {
    const first = buildRapidStepPayload(
      {
        customer: "user@test.com",
        deviceId: "007",
      },
      {
        now: 1_700_000_000_000,
        random: createSequenceRandom([0.1]),
      },
    );
    const second = buildRapidStepPayload(
      {
        customer: "user@test.com",
        deviceId: "007",
      },
      {
        now: 1_700_000_001_000,
        random: createSequenceRandom([0.8]),
      },
    );

    expect(first.testTime).not.toBe(second.testTime);
    expect(first.stepPoints).not.toEqual(second.stepPoints);
    expect(second.customer).toBe(first.customer);
    expect(second.deviceId).toBe(first.deviceId);
  });
});
