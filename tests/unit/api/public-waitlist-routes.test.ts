import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST as preregisterPOST } from '@/app/api/preregister/route';
import { POST as questionnairePOST } from '@/app/api/questionnaire/route';
import { POST as siteVisitPOST } from '@/app/api/update-site-visit/route';
import { FakeFirestore } from '../support/fakeFirestore';

// `vi.mock` is hoisted above these imports, so the routes see the fake.

const firestore = vi.hoisted(() => ({ current: null as unknown, unavailable: false }));

vi.mock('@/lib/server/firebaseAdmin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/firebaseAdmin')>();
  return {
    ...actual,
    getAdminFirestore: () => {
      if (firestore.unavailable) throw new actual.FirebaseAdminUnavailableError('FIREBASE_SERVICE_ACCOUNT_JSON is not set');
      return firestore.current;
    },
  };
});

let fake: FakeFirestore;

beforeEach(() => {
  fake = new FakeFirestore();
  firestore.current = fake;
  firestore.unavailable = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const signup = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };

describe('POST /api/preregister', () => {
  it('answers a new and an already-listed address identically', async () => {
    const first = await preregisterPOST(post('/api/preregister', signup));
    const second = await preregisterPOST(post('/api/preregister', { ...signup, email: 'ADA@example.com' }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
    expect(fake.ids('preregistered_users')).toHaveLength(1);
    expect(fake.collectionScans).toEqual([]);
  });

  it('refuses invalid input without touching Firestore', async () => {
    const res = await preregisterPOST(post('/api/preregister', { ...signup, email: 'nope' }));
    expect(res.status).toBe(400);
    expect(fake.ids('preregistered_users')).toEqual([]);
  });

  it('refuses malformed JSON and oversized bodies', async () => {
    expect((await preregisterPOST(post('/api/preregister', '{not json'))).status).toBe(400);
    const huge = JSON.stringify({ ...signup, padding: 'x'.repeat(40 * 1024) });
    expect((await preregisterPOST(post('/api/preregister', huge))).status).toBe(413);
  });

  it('fails closed with 503 when the service-account credential is missing', async () => {
    firestore.unavailable = true;
    const res = await preregisterPOST(post('/api/preregister', signup));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toMatch(/FIREBASE_SERVICE_ACCOUNT_JSON/);
  });

  it('prefers Vercel geolocation over the client-supplied location', async () => {
    await preregisterPOST(
      post('/api/preregister', { ...signup, clientLocation: 'Claimed, Nowhere' }, { 'x-vercel-ip-country': 'US', 'x-vercel-ip-city': 'Columbia' }),
    );
    const [id] = fake.ids('preregistered_users');
    expect(fake.read('preregistered_users', id)?.location).toBe('Columbia, United States');
  });
});

describe('POST /api/questionnaire', () => {
  const answers = { prefunding: 'Yes', prefundingWhy: 'Easier' };

  it('responds with the same shape for a new, known, and completed address', async () => {
    const bodies = [];
    for (let i = 0; i < 2; i += 1) {
      const res = await questionnairePOST(post('/api/questionnaire', { ...signup, ...answers }));
      expect(res.status).toBe(200);
      bodies.push(await res.json());
    }
    for (const body of bodies) {
      expect(Object.keys(body).sort()).toEqual(['message', 'siteVisitToken']);
    }
  });

  it('does not let a submission set flags or arbitrary fields', async () => {
    await questionnairePOST(
      post('/api/questionnaire', { ...signup, ...answers, hasCompletedSurvey: true, hasVisitedSite: true, role: 'admin' }),
    );
    const [id] = fake.ids('preregistered_users');
    const stored = fake.read('preregistered_users', id)!;
    expect(stored.hasCompletedSurvey).toBe(false);
    expect(stored).not.toHaveProperty('hasVisitedSite');
    expect(stored).not.toHaveProperty('role');
    expect(Object.keys(stored.surveyData as object).sort()).toEqual(['prefunding', 'prefundingWhy']);
  });
});

describe('POST /api/update-site-visit', () => {
  it('answers identically whether or not the address is listed or the token is valid', async () => {
    const q = await questionnairePOST(post('/api/questionnaire', signup));
    const { siteVisitToken } = await q.json();

    const valid = await siteVisitPOST(post('/api/update-site-visit', { email: signup.email, hasVisitedSite: true, siteVisitToken }));
    const unknown = await siteVisitPOST(post('/api/update-site-visit', { email: 'nobody@example.com', hasVisitedSite: true }));

    expect(valid.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await unknown.json()).toEqual(await valid.json());

    const [id] = fake.ids('preregistered_users');
    expect(fake.read('preregistered_users', id)?.hasVisitedSite).toBe(true);
  });

  it('refuses a non-boolean answer', async () => {
    const res = await siteVisitPOST(post('/api/update-site-visit', { email: signup.email, hasVisitedSite: 'yes' }));
    expect(res.status).toBe(400);
  });
});
