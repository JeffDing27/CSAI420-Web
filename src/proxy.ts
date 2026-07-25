import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const legacyToken = request.headers.get("suresteps.session.token");

  if (!legacyToken) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-suresteps-session-token", legacyToken);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/customer/:path*",
    "/rapidsteptest/:path*",
    "/riskscore/:path*",
    "/consent/:path*",
    "/consentedClinicians/:path*",
    "/clinicianAccessRequest/:path*",
    "/clinicianAccessRequests/:path*",
    "/escalate-question/:path*",
    "/escalation/:path*",
  ],
};
