import { NextResponse } from "next/server";
import { AuthService } from "@/lib/service/auth.service";
import { UserRepository } from "@/lib/repository/user.repository";
import { ChatSessionService } from "@/services/chat-session.service";
import { sanitizeString } from "@/utils/sanitize";
import crypto from "crypto";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { errors: ["Invalid JSON body"], requiresChat: true },
      { status: 400 },
    );
  }

  // Extract from new nested format or old flat format
  const chatSessionId = body.chatSessionId;
  const userData = body.userData || {};

  const email = userData.email || body.email;
  const password = userData.password || body.password;
  const birthDate = userData.birthDate || body.birthDate;
  const rawPhone = userData.phone || body.phone;
  const firstName = userData.firstName || body.firstName;
  const lastName = userData.lastName || body.lastName;

  // Validation
  const errors: string[] = [];

  if (!chatSessionId || typeof chatSessionId !== "string") {
    errors.push("Missing required field: chatSessionId");
  }

  // Session timeout check
  if (chatSessionId) {
    try {
      const sessionService = new ChatSessionService();
      const session = await sessionService.getSession(chatSessionId);
      if (session) {
        const now = Date.now();
        const updated = session.updatedAt.getTime();
        if (now - updated > 30 * 60 * 1000) {
          return NextResponse.json(
            { message: "session expired" },
            { status: 408 },
          );
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (
    !email ||
    typeof email !== "string" ||
    email.includes(" ") ||
    !email.includes("@")
  ) {
    errors.push("Invalid email format");
  }

  if (
    !password ||
    typeof password !== "string" ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    errors.push("Password does not meet complexity requirements");
  }

  if (
    !birthDate ||
    typeof birthDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
    isNaN(Date.parse(birthDate))
  ) {
    errors.push("Invalid birthDate, must be YYYY-MM-DD");
  }

  const cleanFirstName = sanitizeString(firstName);
  if (!cleanFirstName) {
    errors.push("Missing or invalid firstName");
  }

  const cleanLastName = sanitizeString(lastName);
  if (!cleanLastName) {
    errors.push("Missing or invalid lastName");
  }

  if (errors.length > 0) {
    return NextResponse.json({ errors, requiresChat: true }, { status: 400 });
  }

  const normalizedEmail = AuthService.normalizeEmail(email);

  // Idempotency check:
  const existingUser = await UserRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    return NextResponse.json(
      {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          createdAt: existingUser.createdAt.toISOString(),
        },
        message: "Account created successfully via chat assistant!",
      },
      { status: 201 },
    );
  }

  // Generate synthetic phone if missing
  let phone = rawPhone;
  if (!phone) {
    const hash = crypto
      .createHash("sha256")
      .update(chatSessionId + normalizedEmail)
      .digest("hex");
    const numStr = parseInt(hash.substring(0, 8), 16)
      .toString()
      .padStart(10, "0");
    phone = `+1${numStr.substring(0, 10)}`;
  }

  const userName = normalizedEmail.split("@")[0];

  const payload = {
    userName,
    email: normalizedEmail,
    password,
    verifyPassword: password, // For strict contract with existing AuthService, if needed
    firstName: cleanFirstName,
    lastName: cleanLastName,
    birthDate,
    phone,
    region: "US",
    agreedToTermsOfUseDate: new Date().toISOString(),
    agreedToCookiePolicyDate: new Date().toISOString(),
    agreedToPrivacyPolicyDate: new Date().toISOString(),
    agreedToTextMessageDate: new Date().toISOString(),
  };

  const { user, error } = await AuthService.signup(payload);

  if (error || !user) {
    return NextResponse.json(
      { errors: [error || "Registration failed"], requiresChat: true },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
      },
      message: "Account created successfully via chat assistant!",
    },
    { status: 201 },
  );
}
