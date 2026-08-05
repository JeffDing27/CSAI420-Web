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
    "/customer",
    "/customer/:path*",
    "/rapidsteptest",
    "/rapidsteptest/:path*",
    "/riskscore",
    "/riskscore/:path*",
    "/consent",
    "/consent/:path*",
    "/consentedClinicians",
    "/consentedClinicians/:path*",
    "/clinicianAccessRequest",
    "/clinicianAccessRequest/:path*",
    "/clinicianAccessRequests",
    "/clinicianAccessRequests/:path*",
    "/escalate-question",
    "/escalate-question/:path*",
    "/escalation",
    "/escalation/:path*",
    "/escalations",
    "/escalations/:path*",
  ],
};
