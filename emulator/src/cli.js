#!/usr/bin/env node

import process from "node:process";
import { sendRapidStepTest } from "./client.js";
import { readState } from "./state.js";

const HELP_TEXT = `Usage:
  stedi-sim set-device-id <deviceId>
  stedi-sim set customer <email>
  stedi-sim set session-token <token>
  stedi-sim set target-base-url <url>
  stedi-sim on
  stedi-sim off
  stedi-sim status
  stedi-sim send-steps
`;

function getControlBaseUrl() {
  const port = process.env.STEDI_SIM_CONTROL_PORT ?? "4010";
  return `http://127.0.0.1:${port}/`;
}

function mapSetField(field) {
  switch (field) {
    case "customer":
      return "customer";
    case "session-token":
      return "sessionToken";
    case "target-base-url":
      return "targetBaseUrl";
    default:
      throw new Error(`Unsupported setting: ${field}`);
  }
}

export function parseCommand(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "help" || command === "--help") {
    return { type: "help" };
  }

  if (command === "set-device-id") {
    if (rest.length !== 1) {
      throw new Error("set-device-id requires exactly one device ID");
    }

    return { key: "deviceId", type: "set", value: rest[0] };
  }

  if (command === "set") {
    if (rest.length < 2) {
      throw new Error("set requires a field and a value");
    }

    return {
      key: mapSetField(rest[0]),
      type: "set",
      value: rest.slice(1).join(" "),
    };
  }

  if (command === "on" || command === "off") {
    return { state: command, type: "power" };
  }

  if (command === "status") {
    return { type: "status" };
  }

  if (command === "send-steps") {
    return { type: "send-steps" };
  }

  throw new Error(`Unknown command: ${command}`);
}

export function findMissingStepConfig(state) {
  const missing = [];

  if (!state.deviceId) {
    missing.push("deviceId");
  }
  if (!state.customer) {
    missing.push("customer");
  }
  if (!state.sessionToken) {
    missing.push("sessionToken");
  }

  return missing;
}

async function callControl(fetchImpl, path, init = {}) {
  const response = await fetchImpl(new URL(path, getControlBaseUrl()), {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      parsed?.error || `Control request failed with ${response.status}`,
    );
  }

  return parsed;
}

export async function runCli(argv, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const output = dependencies.output ?? {
    stderr: process.stderr,
    stdout: process.stdout,
  };
  const readStateFn = dependencies.readStateFn ?? readState;
  const sendRapidStepTestFn =
    dependencies.sendRapidStepTestFn ?? sendRapidStepTest;

  let command;
  try {
    command = parseCommand(argv);
  } catch (error) {
    output.stderr.write(`${error.message}\n`);
    return 1;
  }

  if (command.type === "help") {
    output.stdout.write(HELP_TEXT);
    return 0;
  }

  if (command.type === "set") {
    const state = await callControl(fetchImpl, "/config", {
      body: JSON.stringify({ key: command.key, value: command.value }),
      method: "POST",
    });
    output.stdout.write(`${command.key}=${state[command.key]}\n`);
    return 0;
  }

  if (command.type === "power") {
    const state = await callControl(fetchImpl, "/power", {
      body: JSON.stringify({ state: command.state }),
      method: "POST",
    });
    output.stdout.write(`powerState=${state.powerState}\n`);
    return 0;
  }

  if (command.type === "status") {
    const state = await callControl(fetchImpl, "/status", { method: "GET" });
    output.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    return 0;
  }

  const state = await readStateFn();
  const missing = findMissingStepConfig(state);
  if (missing.length > 0) {
    output.stderr.write(
      `Missing required configuration: ${missing.join(", ")}\n`,
    );
    return 1;
  }

  const result = await sendRapidStepTestFn(state, {
    fetchImpl,
  });
  output.stdout.write(`status=${result.status}\n`);
  output.stdout.write(`${result.body}\n`);
  return result.status >= 200 && result.status < 300 ? 0 : 1;
}

export async function main(argv = process.argv.slice(2)) {
  const exitCode = await runCli(argv);
  process.exitCode = exitCode;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  void main();
}
