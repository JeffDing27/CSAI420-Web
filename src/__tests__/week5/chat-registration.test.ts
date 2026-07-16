import { describe, it, expect, afterEach } from 'vitest';
import { POST as ContinueSession } from '@/app/chat/continue-session/route';
import { POST as ChatAssisted } from '@/app/user/chat-assisted/route';
import { POST as EscalateRegistration } from '@/app/escalate-registration/route';
import { resetKvFallback } from '@/utils/kv-store';

describe('Week 5: Chat-Assisted Registration', () => {
  afterEach(() => {
    resetKvFallback();
  });

  const createRequest = (url: string, body?: any) => {
    return new Request(`http://localhost${url}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  };

  it('POST /chat/continue-session starts a session', async () => {
    const req = createRequest('/api/chat', { sessionId: 'test-session-123', message: 'hello' });
    const res = await ContinueSession(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.nextStep).toBe('firstName');
    expect(data.aiResponse).toContain('first name');
  });

  it('POST /user/chat-assisted validates input', async () => {
    const req = createRequest('/api/user/chat-assisted', { email: 'test@stedi.me' });
    const res = await ChatAssisted(req);
    expect(res.status).toBe(400); // Missing fields
  });

  it('POST /escalate-registration validates reason', async () => {
    const req = createRequest('/api/escalate-registration', { sessionId: 'test', reason: 'invalid_reason' });
    const res = await EscalateRegistration(req);
    expect(res.status).toBe(400);
  });

  it('POST /escalate-registration works with valid reason', async () => {
    const req = createRequest('/api/escalate-registration', { sessionId: 'test', reason: 'confusion_about_process' });
    const res = await EscalateRegistration(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('escalated');
  });
});
