import { NextResponse } from "next/server";
import { AuthService } from "@/lib/service/auth.service";
import { PushTokenService } from "@/services/push-token.service";

const pushTokenService = new PushTokenService();

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionId = authHeader?.replace("Bearer ", "");
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await AuthService.validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, platform } = body;

    if (!token || !platform) {
      return NextResponse.json(
        { error: "Token and platform are required" },
        { status: 400 },
      );
    }

    const pushToken = await pushTokenService.registerToken(
      session.userId,
      platform,
      token,
    );

    return NextResponse.json({ success: true, pushToken });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionId = authHeader?.replace("Bearer ", "");
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await AuthService.validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await pushTokenService.deactivateToken(token);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionId = authHeader?.replace("Bearer ", "");
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await AuthService.validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokens = await pushTokenService.getUserTokens(session.userId);

    return NextResponse.json({ success: true, tokens });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 },
    );
  }
}
