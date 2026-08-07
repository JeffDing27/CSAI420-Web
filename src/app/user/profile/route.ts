import { NextResponse } from "next/server";
import { StediAuthService } from "@/lib/service/stedi-auth.service";

const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, suresteps.session.token, x-stedi-device-id, x-stedi-device-token",
});

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(request: Request) {
  try {
    const { profile, error, status } = await StediAuthService.resolveAuthenticatedProfile(request);

    if (error || !profile) {
      return NextResponse.json(
        { error: error || "Unauthorized" },
        {
          status: status || 401,
          headers: getCorsHeaders(),
        },
      );
    }

    // Try fetching the legacy user info from STEDI
    let legacyData = {};
    const possibleHeaders = ["suresteps.session.token", "x-suresteps-session-token", "suresteps-session-token", "authorization"];
    let token: string | null = null;
    request.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (possibleHeaders.includes(lowerKey)) {
        if (lowerKey === "authorization" && val.startsWith("Bearer ")) {
          if (!token) token = val.substring(7);
        } else {
          if (!token) token = val;
        }
      }
    });

    if (token) {
      const legacyUser = await StediAuthService.getLegacyUser(profile.externalEmail, token);
      if (legacyUser) {
        legacyData = {
          userName: legacyUser.userName || legacyUser.email,
          firstName: legacyUser.firstName,
          lastName: legacyUser.lastName,
          email: legacyUser.email,
          phone: legacyUser.phone,
          birthDate: legacyUser.birthDate,
          region: legacyUser.region,
        };
      }
    }

    return NextResponse.json(
      {
        id: profile.id, // we expose the local profile ID
        role: profile.role,
        ...legacyData,
      },
      {
        status: 200,
        headers: getCorsHeaders(),
      },
    );
  } catch (error) {
    console.error("Failed to load user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      {
        status: 500,
        headers: getCorsHeaders(),
      },
    );
  }
}
