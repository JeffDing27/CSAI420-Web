import type { AuthSession, User } from "@prisma/client";
import crypto from "crypto";
import { AuthSessionRepository } from "../repository/auth-session.repository";
import { CustomerReferenceRepository } from "../repository/customer-reference.repository";
import { UserRepository } from "../repository/user.repository";

export class AuthService {
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static normalizePhone(phone: string): string {
    // Basic normalization: remove non-numeric characters except leading +
    return phone.replace(/[^\d+]/g, "");
  }

  static async signup(
    payload: any,
  ): Promise<{ user: User | null; error?: string }> {
    const { userName, email, password, birthDate, phone, region } = payload;

    const normalizedEmail = AuthService.normalizeEmail(email);
    const normalizedPhone = AuthService.normalizePhone(phone);

    const existingUserEmail = await UserRepository.findByEmail(normalizedEmail);
    if (existingUserEmail)
      return { user: null, error: "User already exists with this email" };

    const existingUserPhone = await UserRepository.findByPhone(normalizedPhone);
    if (existingUserPhone)
      return { user: null, error: "User already exists with this phone" };

    const existingUserName = await UserRepository.findByUserName(userName);
    if (existingUserName)
      return { user: null, error: "User already exists with this username" };

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");

    const user = await UserRepository.create({
      userName,
      email: normalizedEmail,
      phone: normalizedPhone,
      birthDate,
      region,
      passwordHash,
      passwordSalt: salt,
      firstName: payload.firstName || "",
      lastName: payload.lastName || "",
    });

    // Create CustomerReference
    await CustomerReferenceRepository.upsert({
      name: `${user.firstName} ${user.lastName}`.trim() || user.userName,
      phone: user.phone,
      email: user.email,
      userId: user.id,
      externalCustomerId: null,
    });

    return { user };
  }

  static async login(
    userNameOrEmail: string,
    password: string,
  ): Promise<{ token?: string; error?: string }> {
    const normalized = AuthService.normalizeEmail(userNameOrEmail);

    // Try email first
    let user = await UserRepository.findByEmail(normalized);

    // Fallback to username
    if (!user) {
      user = await UserRepository.findByUserName(userNameOrEmail);
    }

    if (!user || !user.passwordSalt || !user.passwordHash) {
      return { error: "Invalid credentials" };
    }

    const salt = user.passwordSalt;
    const expectedHash = user.passwordHash;
    const submittedHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");

    const expectedHashBuffer = Buffer.from(expectedHash, "hex");
    const submittedHashBuffer = Buffer.from(submittedHash, "hex");

    if (
      expectedHashBuffer.length !== submittedHashBuffer.length ||
      !crypto.timingSafeEqual(expectedHashBuffer, submittedHashBuffer)
    ) {
      return { error: "Invalid credentials" };
    }

    // Generate Session Token
    const rawToken = crypto.randomUUID();
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    await AuthSessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      revokedAt: null,
    });

    return { token: rawToken };
  }

  static async validateSession(rawToken: string): Promise<AuthSession | null> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const session = await AuthSessionRepository.findByTokenHash(tokenHash);

    if (!session) return null;
    if (session.revokedAt) return null;
    if (new Date() > session.expiresAt) return null;

    return session;
  }

  static async logout(rawToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    await AuthSessionRepository.revoke(tokenHash);
  }
}
