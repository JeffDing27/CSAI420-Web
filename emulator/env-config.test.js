import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEmulatorEnv } from "./src/load-env.js";
import { createDefaultState, readState } from "./src/state.js";

const createdDirectories = new Set();

describe("emulator env config", () => {
  afterEach(async () => {
    const stateFile = process.env.STEDI_SIM_STATE_FILE;

    delete process.env.STEDI_SIM_ENV_FILE;
    delete process.env.STEDI_SIM_STATE_DIR;
    delete process.env.STEDI_SIM_STATE_FILE;
    delete process.env.STEDI_SIM_TARGET_BASE_URL;

    if (stateFile) {
      createdDirectories.add(path.dirname(stateFile));
    }

    for (const directory of createdDirectories) {
      await fs.rm(directory, {
        force: true,
        recursive: true,
      });
      createdDirectories.delete(directory);
    }
  });

  it("loads the default target base URL from an emulator env file", async () => {
    const tempDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "stedi-sim-env-"),
    );
    const envFile = path.join(tempDirectory, ".env");
    createdDirectories.add(tempDirectory);

    await fs.writeFile(
      envFile,
      "STEDI_SIM_TARGET_BASE_URL=http://localhost:3000\n",
    );
    loadEmulatorEnv({ override: true, path: envFile });

    expect(createDefaultState().targetBaseUrl).toBe("http://localhost:3000");
  });

  it("prefers the env target over the legacy persisted default", async () => {
    const tempDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "stedi-sim-state-"),
    );
    const envFile = path.join(tempDirectory, ".env");
    const stateFile = path.join(tempDirectory, "state.json");
    createdDirectories.add(tempDirectory);

    await fs.writeFile(
      envFile,
      "STEDI_SIM_TARGET_BASE_URL=http://localhost:3000\n",
    );
    await fs.writeFile(
      stateFile,
      `${JSON.stringify({ targetBaseUrl: "https://stedi-voice.vercel.app" }, null, 2)}\n`,
    );

    loadEmulatorEnv({ override: true, path: envFile });
    process.env.STEDI_SIM_STATE_DIR = tempDirectory;
    process.env.STEDI_SIM_STATE_FILE = stateFile;

    const state = await readState();

    expect(state.targetBaseUrl).toBe("http://localhost:3000");
  });

  it("keeps an explicitly persisted custom target base URL", async () => {
    const tempDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "stedi-sim-state-"),
    );
    const envFile = path.join(tempDirectory, ".env");
    const stateFile = path.join(tempDirectory, "state.json");
    createdDirectories.add(tempDirectory);

    await fs.writeFile(
      envFile,
      "STEDI_SIM_TARGET_BASE_URL=http://localhost:3000\n",
    );
    await fs.writeFile(
      stateFile,
      `${JSON.stringify({ targetBaseUrl: "https://api.example.com" }, null, 2)}\n`,
    );

    loadEmulatorEnv({ override: true, path: envFile });
    process.env.STEDI_SIM_STATE_DIR = tempDirectory;
    process.env.STEDI_SIM_STATE_FILE = stateFile;

    const state = await readState();

    expect(state.targetBaseUrl).toBe("https://api.example.com");
  });
});
