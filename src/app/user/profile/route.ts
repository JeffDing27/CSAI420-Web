import { NextResponse } from "next/server";
import { AuthService } from "@/lib/service/auth.service";
import { UserRepository } from "@/lib/repository/user.repository";

const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, suresteps.session.token",
});

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

function getSessionToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.substring(7).trim();
  }

  return (
    request.headers.get("suresteps.session.token") ||
    request.headers.get("x-suresteps-session-token") ||
    request.headers.get("suresteps-session-token")
  );
}

export async function GET(request: Request) {
  try {
    const token = getSessionToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: getCorsHeaders(),
        },
      );
    }

    const session = await AuthService.validateSession(token);

    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        {
          status: 401,
          headers: getCorsHeaders(),
        },
      );
    }

    const user = await UserRepository.findById(session.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        {
          status: 404,
          headers: getCorsHeaders(),
        },
      );
    }

    return NextResponse.json(
      {
        id: user.id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate,
        region: user.region,
        role: user.role,
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
