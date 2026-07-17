import type { Role } from "@prisma/client";
import { AuthService } from "@/lib/service/auth.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const required = [
    "firstName",
    "lastName",
    "userName",
    "email",
    "phone",
    "birthDate",
    "region",
    "password",
  ];
  if (required.some((field) => typeof body[field] !== "string" || !body[field].trim())) {
    return Response.json({ error: "Complete every required field" }, { status: 400 });
  }

  const role: Role = body.role === "CLINICIAN" ? "CLINICIAN" : "PATIENT";
  const result = await AuthService.signup({
    firstName: body.firstName,
    lastName: body.lastName,
    userName: body.userName.trim(),
    email: body.email,
    phone: body.phone,
    birthDate: body.birthDate,
    region: body.region,
    password: body.password,
    role,
  });

  if (!result.user) {
    return Response.json({ error: result.error }, { status: 409 });
  }

  return Response.json(
    {
      created: true,
      account: {
        email: result.user.email,
        role: result.user.role,
      },
    },
    { status: 201 },
  );
}
