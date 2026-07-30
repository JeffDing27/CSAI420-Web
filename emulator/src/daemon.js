import http from "node:http";
import { sendHeartbeat } from "./client.js";
import {
  createDefaultState,
  DEFAULT_CONTROL_PORT,
  readState,
  updateState,
} from "./state.js";

const ALLOWED_CONFIG_KEYS = new Set([
  "deviceId",
  "customer",
  "sessionToken",
  "targetBaseUrl",
  "heartbeatIntervalMs",
]);

async function parseJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(`${JSON.stringify(body)}\n`);
}

export function createDaemon(options = {}) {
  const stateStore = options.stateStore ?? {
    readState,
    updateState,
  };
  const sendHeartbeatFn = options.sendHeartbeatFn ?? sendHeartbeat;
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const logger = options.logger ?? console;

  let heartbeatTimer = null;

  async function heartbeatTick() {
    const currentState = await stateStore.readState();
    if (currentState.powerState !== "on") {
      await stopHeartbeatLoop();
      return;
    }

    try {
      await sendHeartbeatFn(currentState);
    } catch (error) {
      logger.error("heartbeat failed", error);
    }
  }

  async function startHeartbeatLoop(sendImmediate = false) {
    const currentState = await stateStore.readState();
    if (currentState.powerState !== "on") {
      return;
    }

    if (heartbeatTimer) {
      return;
    }

    if (sendImmediate) {
      await heartbeatTick();
    }

    heartbeatTimer = setIntervalFn(() => {
      void heartbeatTick();
    }, currentState.heartbeatIntervalMs);
  }

  async function stopHeartbeatLoop() {
    if (!heartbeatTimer) {
      return;
    }

    clearIntervalFn(heartbeatTimer);
    heartbeatTimer = null;
  }

  async function setConfig(key, value) {
    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      throw new Error(`Unsupported config key: ${key}`);
    }

    const nextState = await stateStore.updateState((currentState) => ({
      ...currentState,
      [key]: key === "heartbeatIntervalMs" ? Number.parseInt(value, 10) : value,
    }));

    if (nextState.powerState === "on" && key === "heartbeatIntervalMs") {
      await stopHeartbeatLoop();
      await startHeartbeatLoop(false);
    }

    return nextState;
  }

  async function setPowerState(powerState) {
    await stateStore.updateState((currentState) => ({
      ...currentState,
      powerState,
    }));

    if (powerState === "on") {
      await startHeartbeatLoop(true);
    } else {
      await stopHeartbeatLoop();
    }

    return getStatus();
  }

  async function initialize() {
    const currentState = await stateStore.readState();
    if (currentState.powerState === "on") {
      await startHeartbeatLoop(false);
    }
    return currentState;
  }

  async function getStatus() {
    const currentState = await stateStore.readState();
    return {
      ...createDefaultState(),
      ...currentState,
      heartbeatActive: heartbeatTimer !== null,
    };
  }

  async function handleRequest(request, response) {
    try {
      if (request.method === "GET" && request.url === "/status") {
        sendJson(response, 200, await getStatus());
        return;
      }

      if (request.method === "POST" && request.url === "/config") {
        const body = await parseJsonBody(request);
        const nextState = await setConfig(body.key, body.value);
        sendJson(response, 200, nextState);
        return;
      }

      if (request.method === "POST" && request.url === "/power") {
        const body = await parseJsonBody(request);
        if (body.state !== "on" && body.state !== "off") {
          sendJson(response, 400, { error: "Invalid power state" });
          return;
        }

        sendJson(response, 200, await setPowerState(body.state));
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    getStatus,
    handleRequest,
    initialize,
    setConfig,
    setPowerState,
    startHeartbeatLoop,
    stopHeartbeatLoop,
  };
}

export async function startDaemonServer(options = {}) {
  const daemon = createDaemon(options);
  await daemon.initialize();

  const port = options.port ?? DEFAULT_CONTROL_PORT;
  const server = http.createServer((request, response) => {
    void daemon.handleRequest(request, response);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const close = async () => {
    await daemon.stopHeartbeatLoop();
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  };

  return { close, daemon, server };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  startDaemonServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
