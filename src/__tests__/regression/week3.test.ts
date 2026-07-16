import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/clinicianAccessRequest/route';
import { GET } from '@/app/clinicianAccessRequests/[customer]/route';

describe('Week 3: Clinician Access Requests', () => {
  const mockToken = "test-token";
  
  beforeEach(() => {
    // any setup
  });

  const createRequest = (method: string, body?: any, token?: string) => {
    const headers = new Headers();
    if (token) headers.set('suresteps.session.token', token);
    
    return new Request(`http://localhost/api/test`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  };

  it('POST /clinicianAccessRequest should require auth', async () => {
    const req = createRequest('POST', { clinicianUsername: 'test', customerEmail: 'test@test.com' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST /clinicianAccessRequest should add request', async () => {
    const req = createRequest('POST', { clinicianUsername: 'physician@stedi.com', customerEmail: 'test@test.com' }, mockToken);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const text = await res.text();
    expect(text).toBe("Access request submitted successfully");
  });

  it('GET /clinicianAccessRequests/[customer] should return requests', async () => {
    const req = createRequest('GET', undefined, mockToken);
    const res = await GET(req, { params: Promise.resolve({ customer: 'test@test.com' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].clinicianUsername).toBe('physician@stedi.com');
  });

  it('DELETE /clinicianAccessRequest should delete request', async () => {
    const req = createRequest('DELETE', { clinicianUsername: 'physician@stedi.com', customerEmail: 'test@test.com' }, mockToken);
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("Access request deleted successfully");
  });

  it('DELETE /clinicianAccessRequest should return 404 for non-existent', async () => {
    const req = createRequest('DELETE', { clinicianUsername: 'nonexistent@stedi.com', customerEmail: 'test@test.com' }, mockToken);
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
