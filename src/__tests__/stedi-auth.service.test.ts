import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StediAuthService } from '../lib/service/stedi-auth.service';
import prisma from '../lib/prisma';
import { ProfileRole } from '@prisma/client';

// Mock fetch globally
const originalFetch = global.fetch;

describe('StediAuthService', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.spyOn(prisma.profile, 'upsert').mockImplementation(async (args: any) => {
      return {
        id: 'mock-profile-id',
        externalEmail: args.create.externalEmail,
        role: args.create.role,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('returns token on successful login', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'mock-token'
      });

      const result = await StediAuthService.login('user@example.com', 'password');
      expect(result.token).toBe('mock-token');
      expect(result.error).toBeUndefined();
    });

    it('handles JSON string token response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify('json-token')
      });

      const result = await StediAuthService.login('user@example.com', 'password');
      expect(result.token).toBe('json-token');
    });

    it('returns error on 401', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401
      });

      const result = await StediAuthService.login('user@example.com', 'wrong-pass');
      expect(result.status).toBe(401);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateToken', () => {
    it('returns email on valid token', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'user@example.com'
      });

      const result = await StediAuthService.validateToken('valid-token');
      expect(result.email).toBe('user@example.com');
    });

    it('returns error if response is not an email', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'invalid-data'
      });

      const result = await StediAuthService.validateToken('valid-token');
      expect(result.error).toBe('Invalid validation response from upstream');
      expect(result.status).toBe(502);
    });
  });

  describe('resolveAuthenticatedProfile', () => {
    it('authorizes via suresteps.session.token header and upserts profile', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'patient@example.com'
      });

      const req = new Request('http://localhost', {
        headers: { 'suresteps.session.token': 'token-123' }
      });

      const result = await StediAuthService.resolveAuthenticatedProfile(req);
      
      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(result.profile?.externalEmail).toBe('patient@example.com');
      expect(result.profile?.role).toBe(ProfileRole.PATIENT);
      
      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { externalEmail: 'patient@example.com' },
        update: {},
        create: {
          externalEmail: 'patient@example.com',
          role: ProfileRole.PATIENT,
        },
      });
    });

    it('authorizes via Bearer token', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'patient@example.com'
      });

      const req = new Request('http://localhost', {
        headers: { 'authorization': 'Bearer token-123' }
      });

      const result = await StediAuthService.resolveAuthenticatedProfile(req);
      expect(result.profile).toBeDefined();
    });
  });
});
