import fs from "node:fs/promises";
import path from "node:path";
import { loadEmulatorEnv } from "./load-env.js";

loadEmulatorEnv();

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 3000;
export const DEFAULT_CONTROL_PORT = Number.parseInt(
  process.env.STEDI_SIM_CONTROL_PORT ?? "4010",
  10,
);
export const FALLBACK_TARGET_BASE_URL = "https://stedi-voice.vercel.app";

export function getDefaultTargetBaseUrl() {
  return process.env.STEDI_SIM_TARGET_BASE_URL ?? FALLBACK_TARGET_BASE_URL;
}

export function createDefaultState() {
  return {
    deviceId: null,
    customer: null,
    sessionToken: null,
    targetBaseUrl: getDefaultTargetBaseUrl(),
    powerState: "off",
    heartbeatIntervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS,
    controlPort: DEFAULT_CONTROL_PORT,
  };
}

export function getStateDirectory() {
  return (
    process.env.STEDI_SIM_STATE_DIR || path.join(process.cwd(), ".stedi-sim")
  );
}

export function getStateFilePath() {
  return (
    process.env.STEDI_SIM_STATE_FILE ||
    path.join(getStateDirectory(), "state.json")
  );
}

async function ensureStateDirectory() {
  await fs.mkdir(getStateDirectory(), { recursive: true });
}

function mergeWithDefaultState(parsedState) {
  const mergedState = { ...createDefaultState(), ...parsedState };
  const envTargetBaseUrl = process.env.STEDI_SIM_TARGET_BASE_URL;

  if (
    envTargetBaseUrl &&
    (!parsedState.targetBaseUrl ||
      parsedState.targetBaseUrl === FALLBACK_TARGET_BASE_URL)
  ) {
    mergedState.targetBaseUrl = envTargetBaseUrl;
  }

  return mergedState;
}

export async function readState() {
  const stateFilePath = getStateFilePath();

  try {
    const raw = await fs.readFile(stateFilePath, "utf8");
    return mergeWithDefaultState(JSON.parse(raw));
  } catch (error) {
    if (error && typeof error === "object" && error.code !== "ENOENT") {
      throw error;
    }

    const defaultState = createDefaultState();
    await writeState(defaultState);
    return defaultState;
  }
}

export async function writeState(nextState) {
  await ensureStateDirectory();
  const normalizedState = { ...createDefaultState(), ...nextState };
  const persistedState = { ...normalizedState };

  if (persistedState.targetBaseUrl === getDefaultTargetBaseUrl()) {
    delete persistedState.targetBaseUrl;
  }

  await fs.writeFile(
    getStateFilePath(),
    `${JSON.stringify(persistedState, null, 2)}\n`,
  );
  return normalizedState;
}

export async function updateState(updater) {
  const currentState = await readState();
  const nextState =
    typeof updater === "function"
      ? updater(currentState)
      : { ...currentState, ...updater };
  return writeState(nextState);
}
