import { NextResponse } from "next/server";
import {
  DEFAULT_WINDOW_SECONDS,
  getRecentDevices,
  normalizeWindowSeconds,
} from "@/utils/device-status-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const windowSeconds = normalizeWindowSeconds(url.searchParams.get("seconds"));
  const devices = await getRecentDevices(windowSeconds);

  return NextResponse.json(
    {
      devices,
      windowSeconds: windowSeconds || DEFAULT_WINDOW_SECONDS,
    },
    { status: 200 },
  );
}
