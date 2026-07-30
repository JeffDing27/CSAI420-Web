import { kvGet, kvSet } from "@/utils/kv-store";

const DEVICE_STATUS_KEY = "device-status:recent";
const DEFAULT_WINDOW_SECONDS = 10;

export interface DeviceHeartbeat {
  deviceId: string;
  customer: string | null;
  poweredOn: boolean;
  lastSeenAt: number;
}

type DeviceStatusMap = Record<string, DeviceHeartbeat>;

export function normalizeWindowSeconds(value: string | null): number {
  if (!value) {
    return DEFAULT_WINDOW_SECONDS;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_WINDOW_SECONDS;
  }

  return parsed;
}

async function readDeviceStatusMap(): Promise<DeviceStatusMap> {
  return (await kvGet<DeviceStatusMap>(DEVICE_STATUS_KEY)) || {};
}

export async function recordHeartbeat(input: {
  deviceId: string;
  customer?: string | null;
  poweredOn?: boolean;
  recordedAt?: number;
}): Promise<void> {
  const deviceStatusMap = await readDeviceStatusMap();
  deviceStatusMap[input.deviceId] = {
    deviceId: input.deviceId,
    customer: input.customer ?? null,
    poweredOn: input.poweredOn ?? true,
    lastSeenAt: input.recordedAt ?? Date.now(),
  };

  await kvSet(DEVICE_STATUS_KEY, deviceStatusMap);
}

export async function getRecentDevices(
  seconds: number,
): Promise<DeviceHeartbeat[]> {
  const deviceStatusMap = await readDeviceStatusMap();
  const cutoff = Date.now() - seconds * 1000;

  return Object.values(deviceStatusMap)
    .filter((deviceHeartbeat) => deviceHeartbeat.lastSeenAt >= cutoff)
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt);
}

export { DEFAULT_WINDOW_SECONDS };
