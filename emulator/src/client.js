import fs from "node:fs";
import { buildRapidStepPayload } from "./rapid-step-payload.js";

function buildHeaders(sessionToken) {
  const headers = {
    "content-type": "application/json",
  };

  if (sessionToken) {
    headers["suresteps.session.token"] = sessionToken;
  }

  return headers;
}

function isDockerRuntime() {
  return (
    process.env.STEDI_SIM_CONTAINER_RUNTIME === "docker" ||
    fs.existsSync("/.dockerenv")
  );
}

export function normalizeBaseUrl(baseUrl, options = {}) {
  const normalizedUrl = new URL(baseUrl);
  const shouldUseHostAlias =
    (options.isDockerRuntime ?? isDockerRuntime()) &&
    ["127.0.0.1", "localhost"].includes(normalizedUrl.hostname);

  if (shouldUseHostAlias) {
    normalizedUrl.hostname =
      process.env.STEDI_SIM_HOST_ALIAS ?? "host.docker.internal";
  }

  return normalizedUrl.toString().replace(/\/$/, "");
}

function resolveUrl(baseUrl, pathname, options = {}) {
  return new URL(pathname, `${normalizeBaseUrl(baseUrl, options)}/`).toString();
}

async function parseResponseBody(response) {
  const text = await response.text();
  return text;
}

export async function sendHeartbeat(state, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const payload = {
    customer: state.customer,
    deviceId: state.deviceId,
    poweredOn: state.powerState === "on",
    recordedAt: options.now ?? Date.now(),
  };

  const response = await fetchImpl(
    resolveUrl(state.targetBaseUrl, "/sensorUpdates", options),
    {
      method: "POST",
      headers: buildHeaders(state.sessionToken),
      body: JSON.stringify(payload),
    },
  );

  return {
    body: await parseResponseBody(response),
    payload,
    status: response.status,
  };
}

export async function sendRapidStepTest(state, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const payload = buildRapidStepPayload(
    {
      customer: state.customer,
      deviceId: state.deviceId,
    },
    {
      now: options.now ?? Date.now(),
      random: options.random,
    },
  );

  const response = await fetchImpl(
    resolveUrl(state.targetBaseUrl, "/rapidsteptest", options),
    {
      method: "POST",
      headers: buildHeaders(state.sessionToken),
      body: JSON.stringify(payload),
    },
  );

  return {
    body: await parseResponseBody(response),
    payload,
    status: response.status,
  };
}
