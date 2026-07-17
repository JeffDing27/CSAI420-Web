import type { AuthSession, Role, User } from "@prisma/client";
import crypto from "crypto";
import { AuthSessionRepository } from "../repository/auth-session.repository";
import { CustomerReferenceRepository } from "../repository/customer-reference.repository";
import { UserRepository } from "../repository/user.repository";

const SCRYPT_KEY_LENGTH = 64;

export class AuthService {
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static normalizePhone(phone: string): string {
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (trimmed.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    return `+${digits}`;
  }

  private static hashPassword(password: string, salt: string): string {
    return `scrypt$${crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex")}`;
  }

  private static verifyPassword(
    password: string,
    salt: string,
    expectedHash: string,
  ): boolean {
    let submittedHash: string;
    let storedHash = expectedHash;

    if (expectedHash.startsWith("scrypt$")) {
      storedHash = expectedHash.slice("scrypt$".length);
      submittedHash = crypto
        .scryptSync(password, salt, SCRYPT_KEY_LENGTH)
        .toString("hex");
    } else {
      submittedHash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, "sha512")
        .toString("hex");
    }

    const expected = Buffer.from(storedHash, "hex");
    const submitted = Buffer.from(submittedHash, "hex");
    return (
      expected.length === submitted.length &&
      expected.length > 0 &&
      crypto.timingSafeEqual(expected, submitted)
    );
  }

  static async signup(
    payload: {
      userName: string;
      email: string;
      password: string;
      birthDate: string;
      phone: string;
      region: string;
      firstName?: string;
      lastName?: string;
      role?: Role;
    },
  ): Promise<{ user: User | null; error?: string }> {
    const {
      userName,
      email,
      password,
      birthDate,
      phone,
      region,
      role = "PATIENT",
    } = payload;

    const normalizedEmail = AuthService.normalizeEmail(email);
    const normalizedPhone = AuthService.normalizePhone(phone);

    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      return { user: null, error: "Enter a valid phone number" };
    }
    if (password.length < 10) {
      return { user: null, error: "Password must be at least 10 characters" };
    }

    if (await UserRepository.findByEmail(normalizedEmail))
      return { user: null, error: "User already exists with this email" };
    if (await UserRepository.findByPhone(normalizedPhone))
      return { user: null, error: "User already exists with this phone" };
    if (await UserRepository.findByUserName(userName))
      return { user: null, error: "User already exists with this username" };

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = AuthService.hashPassword(password, salt);

    const user = await UserRepository.create({
      userName,
      email: normalizedEmail,
      phone: normalizedPhone,
      birthDate,
      region,
      passwordHash,
      passwordSalt: salt,
      firstName: payload.firstName?.trim() || "",
      lastName: payload.lastName?.trim() || "",
      role,
    });

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
  ): Promise<{ token?: string; user?: User; error?: string }> {
    const normalized = AuthService.normalizeEmail(userNameOrEmail);
    let user = await UserRepository.findByEmail(normalized);
    if (!user) user = await UserRepository.findByUserName(userNameOrEmail);

    if (
      !user ||
      !user.passwordSalt ||
      !user.passwordHash ||
      !AuthService.verifyPassword(password, user.passwordSalt, user.passwordHash)
    ) {
      return { error: "Invalid credentials" };
    }

    const rawToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await AuthSessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      revokedAt: null,
    });

    return { token: rawToken, user };
  }

  static async validateSession(rawToken: string): Promise<AuthSession | null> {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const session = await AuthSessionRepository.findByTokenHash(tokenHash);
    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      return null;
    }
    return session;
  }

  static async logout(rawToken: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await AuthSessionRepository.revoke(tokenHash);
  }
}
