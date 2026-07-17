import { cookies } from "next/headers";
import { AuthService } from "@/lib/service/auth.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.identity !== "string" ||
    typeof body.password !== "string"
  ) {
    return Response.json({ error: "Email/username and password are required" }, { status: 400 });
  }

  const result = await AuthService.login(body.identity, body.password);
  if (!result.token || !result.user) {
    return Response.json({ error: result.error || "Invalid credentials" }, { status: 401 });
  }

  if (
    body.portal === "provider" &&
    result.user.role !== "CLINICIAN" &&
    result.user.role !== "ADMIN"
  ) {
    await AuthService.logout(result.token);
    return Response.json({ error: "Clinician account required" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set("suresteps.session.token", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return Response.json({
    authenticated: true,
    role: result.user.role,
    destination:
      result.user.role === "CLINICIAN" || result.user.role === "ADMIN"
        ? "/provider/patients"
        : "/account",
  });
}
