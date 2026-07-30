import { generateClaimCode, hashClaimCode, normalizeDeviceId } from '../utils/device-secrets';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

describe('device-secrets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('normalizeDeviceId', () => {
    it('normalizes lowercase strings and trims whitespace', () => {
      expect(normalizeDeviceId('  stedi-007  ')).toBe('STEDI-007');
    });

    it('rejects empty or whitespace-only IDs', () => {
      expect(() => normalizeDeviceId('   ')).toThrow('Device ID cannot be empty');
      expect(() => normalizeDeviceId('')).toThrow('Device ID cannot be empty');
    });

    it('rejects invalid characters', () => {
      expect(() => normalizeDeviceId('STEDI@123')).toThrow('Invalid deviceId format');
      expect(() => normalizeDeviceId('STEDI 123')).toThrow('Invalid deviceId format');
    });

    it('rejects too-short IDs', () => {
      expect(() => normalizeDeviceId('AB')).toThrow('Invalid deviceId format');
    });

    it('accepts valid IDs', () => {
      expect(normalizeDeviceId('STEDI-007')).toBe('STEDI-007');
      expect(normalizeDeviceId('DEVICE_123')).toBe('DEVICE_123');
    });
  });

  describe('PEPPER behavior', () => {
    it('uses local-development fallback when NODE_ENV is not production and pepper is absent', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DEVICE_CLAIM_PEPPER;
      const hash1 = hashClaimCode('123456');
      expect(hash1).toBeDefined();
    });

    it('uses configured pepper when it exists', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEVICE_CLAIM_PEPPER = 'my-secret-pepper';
      const hash1 = hashClaimCode('123456');
      
      process.env.DEVICE_CLAIM_PEPPER = 'another-pepper';
      const hash2 = hashClaimCode('123456');
      
      expect(hash1).not.toBe(hash2);
    });

    it('throws in production when DEVICE_CLAIM_PEPPER is absent', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEVICE_CLAIM_PEPPER;
      
      expect(() => hashClaimCode('123456')).toThrow('DEVICE_CLAIM_PEPPER is missing in production');
    });
  });
});
