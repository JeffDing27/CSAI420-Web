import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDaemon } from "./src/daemon.js";
import { readState, writeState } from "./src/state.js";

describe("emulator state", () => {
  afterEach(async () => {
    if (process.env.STEDI_SIM_STATE_FILE) {
      await fs.rm(path.dirname(process.env.STEDI_SIM_STATE_FILE), {
        force: true,
        recursive: true,
      });
      delete process.env.STEDI_SIM_STATE_FILE;
      delete process.env.STEDI_SIM_STATE_DIR;
    }
  });

  it("persists configured fields to disk", async () => {
    const stateDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "stedi-sim-state-"),
    );
    process.env.STEDI_SIM_STATE_DIR = stateDirectory;
    process.env.STEDI_SIM_STATE_FILE = path.join(stateDirectory, "state.json");

    await writeState({
      customer: "user@test.com",
      deviceId: "007",
      sessionToken: "token-123",
      powerState: "off",
    });

    const state = await readState();
    expect(state.customer).toBe("user@test.com");
    expect(state.deviceId).toBe("007");
    expect(state.sessionToken).toBe("token-123");
    expect(state.heartbeatIntervalMs).toBe(3000);
  });
});

describe("emulator daemon", () => {
  it("starts exactly one heartbeat loop when turned on repeatedly", async () => {
    let state = {
      customer: "user@test.com",
      deviceId: "007",
      heartbeatIntervalMs: 3000,
      powerState: "off",
      sessionToken: "token",
      targetBaseUrl: "https://stedi-voice.vercel.app",
    };
    const intervals = [];
    const heartbeatCalls = [];

    const daemon = createDaemon({
      clearIntervalFn: () => {},
      sendHeartbeatFn: async (nextState) => {
        heartbeatCalls.push(nextState.deviceId);
      },
      setIntervalFn: (callback, delay) => {
        intervals.push({ callback, delay });
        return intervals.length;
      },
      stateStore: {
        readState: async () => state,
        updateState: async (updater) => {
          state = updater(state);
          return state;
        },
      },
    });

    await daemon.setPowerState("on");
    await daemon.setPowerState("on");

    expect(intervals).toHaveLength(1);
    expect(intervals[0].delay).toBe(3000);
    expect(heartbeatCalls).toHaveLength(1);
  });

  it("stops the heartbeat loop when turned off", async () => {
    let state = {
      customer: "user@test.com",
      deviceId: "007",
      heartbeatIntervalMs: 3000,
      powerState: "off",
      sessionToken: "token",
      targetBaseUrl: "https://stedi-voice.vercel.app",
    };
    const clearedIntervals = [];

    const daemon = createDaemon({
      clearIntervalFn: (intervalId) => {
        clearedIntervals.push(intervalId);
      },
      sendHeartbeatFn: async () => {},
      setIntervalFn: () => "interval-1",
      stateStore: {
        readState: async () => state,
        updateState: async (updater) => {
          state = updater(state);
          return state;
        },
      },
    });

    await daemon.setPowerState("on");
    const statusWhileOn = await daemon.getStatus();
    expect(statusWhileOn.heartbeatActive).toBe(true);

    await daemon.setPowerState("off");

    const statusWhileOff = await daemon.getStatus();
    expect(statusWhileOff.heartbeatActive).toBe(false);
    expect(clearedIntervals).toEqual(["interval-1"]);
  });
});
