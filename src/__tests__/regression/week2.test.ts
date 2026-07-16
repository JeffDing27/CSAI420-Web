import { describe, it, expect } from 'vitest';
import { GET as GetConsent, PATCH as PatchConsent } from '@/app/consent/[customer]/route';
import { GET as GetClinicians, PATCH as PatchClinicians } from '@/app/consentedClinicians/[customer]/route';

describe('Week 2: Consent and Clinicians', () => {
  const createRequest = (method: string, body?: string) => {
    return new Request(`http://localhost/api/test`, {
      method,
      body: body ? body : undefined
    });
  };

  it('PATCH /consent/[customer] should update consent', async () => {
    const req = createRequest('PATCH', 'true');
    const res = await PatchConsent(req, { params: Promise.resolve({ customer: 'test_user' }) });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("Consent updated successfully.");
  });

  it('GET /consent/[customer] should get consent', async () => {
    const req = createRequest('GET');
    const res = await GetConsent(req, { params: Promise.resolve({ customer: 'test_user' }) });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("true");
  });

  it('PATCH /consentedClinicians/[customer] should add clinician', async () => {
    const req = createRequest('PATCH', 'doc@stedi.com');
    // Add token header just in case, though current mock doesn't strictly check for consent patch
    req.headers.set('suresteps.session.token', 'test-token');
    const res = await PatchClinicians(req, { params: Promise.resolve({ customer: 'test_user' }) });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("Clinician consent updated successfully.");
  });

  it('GET /consentedClinicians/[customer] should return clinicians', async () => {
    const req = createRequest('GET');
    req.headers.set('suresteps.session.token', 'test-token');
    const res = await GetClinicians(req, { params: Promise.resolve({ customer: 'test_user' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].clinicianUsername).toBe('doc@stedi.com');
  });
});
