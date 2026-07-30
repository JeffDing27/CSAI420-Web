import crypto from 'crypto';

const FALLBACK_PEPPER = 'local-development-fallback-pepper-do-not-use-in-prod';
const CLAIM_CODE_PREFIX = 'claim_code:';
const DEVICE_TOKEN_PREFIX = 'device_token:';

function getPepper(): string {
  if (process.env.DEVICE_CLAIM_PEPPER) {
    return process.env.DEVICE_CLAIM_PEPPER;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DEVICE_CLAIM_PEPPER is missing in production');
  }
  return FALLBACK_PEPPER;
}

export function normalizeDeviceId(deviceId: string): string {
  if (typeof deviceId !== 'string') {
    throw new Error('Invalid deviceId format');
  }
  const normalized = deviceId.trim().toUpperCase();
  if (!normalized) {
    throw new Error('Device ID cannot be empty');
  }
  const regex = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;
  if (!regex.test(normalized)) {
    throw new Error('Invalid deviceId format');
  }
  return normalized;
}

export function generateClaimCode(): string {
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, '0');
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashClaimCode(claimCode: string): string {
  const pepper = getPepper();
  const hmac = crypto.createHmac('sha256', pepper);
  hmac.update(`${CLAIM_CODE_PREFIX}${claimCode}`);
  return hmac.digest('hex');
}

export function hashDeviceToken(deviceToken: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${DEVICE_TOKEN_PREFIX}${deviceToken}`);
  return hash.digest('hex');
}

export function verifyClaimCode(claimCode: string, hash: string): boolean {
  try {
    const computedHash = hashClaimCode(claimCode);
    const computedBuf = Buffer.from(computedHash, 'hex');
    const hashBuf = Buffer.from(hash, 'hex');
    if (computedBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, hashBuf);
  } catch {
    return false;
  }
}

export function verifyDeviceToken(deviceToken: string, hash: string): boolean {
  try {
    const computedHash = hashDeviceToken(deviceToken);
    const computedBuf = Buffer.from(computedHash, 'hex');
    const hashBuf = Buffer.from(hash, 'hex');
    if (computedBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, hashBuf);
  } catch {
    return false;
  }
}
