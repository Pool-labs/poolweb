import { describe, expect, it } from 'vitest';

import { AdminApiError } from '@/lib/admin/adminApi';
import { describeCreateFailure } from '@/lib/admin/adminErrors';

describe('describeCreateFailure', () => {
  it('explains a MISSING ENDPOINT instead of reporting a generic failure', () => {
    // ⚠️ This is today's real path: POST /admin/users and /admin/pools do not
    // exist on any environment (poolmobile#684). "Request failed (404)" reads
    // as "the dashboard is broken"; this reads as "the API has not shipped it".
    const out = describeCreateFailure(new AdminApiError('Not Found', 404), 'user');
    expect(out.notServedYet).toBe(true);
    expect(out.message).toContain('cannot create users yet');
    expect(out.message).toContain('poolmobile#684');
    expect(out.message).toContain('Nothing was created');
    // And it absolves the typist — the inputs were fine.
    expect(out.message).toContain('nothing you typed was wrong');
  });

  it.each([405, 501])('treats %i as not-served-yet too', (status) => {
    expect(describeCreateFailure(new AdminApiError('x', status), 'pool').notServedYet).toBe(true);
  });

  it('passes a validation refusal through — the server names the field', () => {
    const out = describeCreateFailure(
      new AdminApiError('A pool name is required.', 400),
      'pool',
    );
    expect(out.notServedYet).toBe(false);
    expect(out.message).toBe('A pool name is required. Nothing was created.');
  });

  it('says a forbidden write was refused, not that it broke', () => {
    const out = describeCreateFailure(new AdminApiError('Forbidden', 403), 'pool');
    expect(out.message).toContain('not allowed to create pools');
    expect(out.message).toContain('Nothing was created');
  });

  it('names the rate limit rather than echoing a bare 429', () => {
    const out = describeCreateFailure(new AdminApiError('Too Many Requests', 429), 'user');
    expect(out.message).toContain('Wait a moment');
    expect(out.message).toContain('nothing was created');
  });

  it.each([502, 503, 504])(
    'REFUSES to claim nothing was created on a %i — it may have been',
    (status) => {
      // ⚠️ The dangerous one. A gateway timeout means the write may well have
      // completed upstream; "nothing was created" invites a retry that makes a
      // duplicate. This is the staging ALB's 60s idle timeout in the QA
      // console's reseed, one surface over.
      const out = describeCreateFailure(new AdminApiError('Gateway Timeout', status), 'pool');
      expect(out.message).not.toContain('Nothing was created');
      expect(out.message).not.toContain('nothing was created');
      expect(out.message).toContain('may still have created');
      expect(out.message).toContain('refresh the list');
    },
  );

  it('falls back to the server message for an unexpected status', () => {
    const out = describeCreateFailure(new AdminApiError('Teapot', 418), 'user');
    expect(out.message).toBe('Teapot Nothing was created.');
  });

  it('survives a non-API error, and a thrown non-Error', () => {
    expect(describeCreateFailure(new Error('network down'), 'user').message).toBe(
      'network down Nothing was created.',
    );
    expect(describeCreateFailure('nope', 'pool').message).toBe(
      'Could not create the pool. Nothing was created.',
    );
    expect(describeCreateFailure(undefined, 'user').message).toBe(
      'Could not create the user. Nothing was created.',
    );
  });
});
