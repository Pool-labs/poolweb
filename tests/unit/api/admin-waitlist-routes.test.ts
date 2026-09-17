import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { adminCookies } from '@/lib/admin/authCookies';
import { DELETE as entryDELETE } from '@/app/admin/api/waitlist/[id]/route';
import { GET as listGET } from '@/app/admin/api/waitlist/route';
import { FakeFirestore } from '../support/fakeFirestore';

// `vi.mock` is hoisted above these imports, so the routes see the fake.

const firestore = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('@/lib/server/firebaseAdmin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/firebaseAdmin')>();
  return { ...actual, getAdminFirestore: () => firestore.current };
});

const PROD = adminCookies('production');
const STAGING = adminCookies('staging');

/** A JWT-shaped token whose payload carries `sub` (the API verifies signatures, not us). */
function token(sub: string) {
  const payload = Buffer.from(JSON.stringify({ sub })).toString('base64url');
  return `h.${payload}.s`;
}

function request(method: string, path: string, cookies: Record<string, string>, headers: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return new NextRequest(`http://localhost${path}`, { method, headers: { cookie, ...headers } });
}

const productionSession = { pool_admin_env: 'production', [PROD.accessToken]: token('admin-1') };

let fake: FakeFirestore;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fake = new FakeFirestore();
  firestore.current = fake;
  fake.seed('preregistered_users', 'entry1', {
    firstName: 'Ada',
    email: 'ada@example.com',
    siteVisitTokenHash: 'secret-hash',
  });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const apiStatus = (status: number) => new Response('{}', { status });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /admin/api/waitlist', () => {
  it('404s when production is not the selected environment — no API call, no Firestore read', async () => {
    const res = await listGET(request('GET', '/admin/api/waitlist', { pool_admin_env: 'staging', [STAGING.accessToken]: token('a') }));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.collectionScans).toEqual([]);
  });

  it('401s with no production session cookie', async () => {
    const res = await listGET(request('GET', '/admin/api/waitlist', { pool_admin_env: 'production' }));
    expect(res.status).toBe(401);
    expect(fake.collectionScans).toEqual([]);
  });

  it('refuses a session the production API does not accept as a platform admin (a forged cookie)', async () => {
    fetchMock.mockResolvedValue(apiStatus(403));
    const res = await listGET(request('GET', '/admin/api/waitlist', productionSession));

    expect(res.status).toBe(403);
    expect(fake.collectionScans).toEqual([]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.poolapp.co/api/v1/admin/metrics/signups?days=1');
    expect(init.headers.Authorization).toBe(`Bearer ${token('admin-1')}`);
  });

  it('fails closed with 502 when the API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await listGET(request('GET', '/admin/api/waitlist', productionSession));
    expect(res.status).toBe(502);
    expect(fake.collectionScans).toEqual([]);
  });

  it('returns entries to a verified admin, projected — no token hash', async () => {
    fetchMock.mockResolvedValue(apiStatus(200));
    const res = await listGET(request('GET', '/admin/api/waitlist', productionSession));

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ id: 'entry1', email: 'ada@example.com' });
    expect(JSON.stringify(body)).not.toContain('secret-hash');
  });

  it('refreshes an expired access token once and writes the new pair back', async () => {
    const fresh = token('admin-1-fresh');
    fetchMock
      .mockResolvedValueOnce(apiStatus(401)) // probe with the stale token
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { accessToken: fresh, refreshToken: 'rt2' } }), { status: 200 }),
      )
      .mockResolvedValueOnce(apiStatus(200)); // probe with the fresh token

    const res = await listGET(
      request('GET', '/admin/api/waitlist', { ...productionSession, [PROD.refreshToken]: 'rt1' }),
    );

    expect(res.status).toBe(200);
    expect(res.cookies.get(PROD.accessToken)?.value).toBe(fresh);
    expect(res.cookies.get(PROD.refreshToken)?.value).toBe('rt2');
  });

  it('401s when the token is expired and cannot be refreshed', async () => {
    fetchMock.mockResolvedValue(apiStatus(401));
    const res = await listGET(request('GET', '/admin/api/waitlist', productionSession));
    expect(res.status).toBe(401);
    expect(fake.collectionScans).toEqual([]);
  });
});

describe('DELETE /admin/api/waitlist/:id', () => {
  it('refuses a browser-flagged cross-site request before anything else', async () => {
    const res = await entryDELETE(
      request('DELETE', '/admin/api/waitlist/entry1', productionSession, { 'sec-fetch-site': 'cross-site' }),
      ctx('entry1'),
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.read('preregistered_users', 'entry1')).toBeDefined();
  });

  it('refuses a non-admin and deletes nothing', async () => {
    fetchMock.mockResolvedValue(apiStatus(403));
    const res = await entryDELETE(request('DELETE', '/admin/api/waitlist/entry1', productionSession), ctx('entry1'));
    expect(res.status).toBe(403);
    expect(fake.read('preregistered_users', 'entry1')).toBeDefined();
  });

  it('404s outside production', async () => {
    const res = await entryDELETE(
      request('DELETE', '/admin/api/waitlist/entry1', { pool_admin_env: 'staging', [STAGING.accessToken]: token('a') }),
      ctx('entry1'),
    );
    expect(res.status).toBe(404);
    expect(fake.read('preregistered_users', 'entry1')).toBeDefined();
  });

  it('deletes for a verified admin and records the deletion against their user id', async () => {
    fetchMock.mockResolvedValue(apiStatus(200));
    const res = await entryDELETE(
      request('DELETE', '/admin/api/waitlist/entry1', productionSession, { 'sec-fetch-site': 'same-origin' }),
      ctx('entry1'),
    );

    expect(res.status).toBe(200);
    expect(fake.read('preregistered_users', 'entry1')).toBeUndefined();
    const [recordId] = fake.ids('waitlist_deletions');
    expect(fake.read('waitlist_deletions', recordId)).toMatchObject({ entryId: 'entry1', deletedBy: 'admin-1' });
  });

  it('rejects an id that is not a plain document id, and 404s a missing one', async () => {
    fetchMock.mockResolvedValue(apiStatus(200));
    const bad = await entryDELETE(request('DELETE', '/admin/api/waitlist/x', productionSession), ctx('../users'));
    expect(bad.status).toBe(400);

    const missing = await entryDELETE(request('DELETE', '/admin/api/waitlist/ghost', productionSession), ctx('ghost'));
    expect(missing.status).toBe(404);
  });
});
