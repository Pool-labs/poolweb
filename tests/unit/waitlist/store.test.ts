import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  deleteWaitlistEntry,
  listWaitlistEntries,
  preregister,
  recordSiteVisit,
  SITE_VISIT_TOKEN_TTL_MS,
  submitQuestionnaire,
  toWaitlistEntry,
  waitlistDocId,
} from '@/lib/waitlist/store';
import { WAITLIST_COLLECTION, WAITLIST_DELETIONS_COLLECTION, type SurveyData } from '@/lib/waitlist/types';
import { FakeFirestore } from '../support/fakeFirestore';

const NOW = new Date('2026-09-14T12:00:00.000Z');
const LATER = new Date(NOW.getTime() + 60_000);

const COMPLETE_SURVEY: SurveyData = {
  prefunding: 'Yes',
  prefundingWhy: 'Easier',
  settlementMethods: ['Split the check'],
  settlementMethodsOther: '',
  settlementFeedback: 'Slow',
  moneyInAir: "Don't know",
  moneyInAirAmount: '',
  weeklySpend: '40',
  splitTypes: ['Food & drinks'],
  splitTypesOther: '',
  hangoutPoolWillingness: 'Both',
  hangoutPoolWhy: '',
  socialFeatures: ['Messaging'],
  socialFeaturesOther: '',
  friendConversion: 'Pretty easy',
};

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

let fake: FakeFirestore;
let db: ReturnType<FakeFirestore['asFirestore']>;

beforeEach(() => {
  fake = new FakeFirestore();
  db = fake.asFirestore();
});

const contact = { firstName: 'Ada', lastName: 'Lovelace', email: 'Ada@Example.com', location: 'London, UK' };

describe('preregister', () => {
  it('keys a new entry by the sha256 of the normalized email, without listing the collection', async () => {
    await expect(preregister(db, contact, NOW)).resolves.toBe('created');

    const id = sha256('ada@example.com');
    expect(waitlistDocId('  ADA@example.com ')).toBe(id);
    expect(fake.read(WAITLIST_COLLECTION, id)).toMatchObject({
      firstName: 'Ada',
      email: 'ada@example.com',
      hasPreregistered: true,
      location: 'London, UK',
    });
    expect(fake.collectionScans).toEqual([]);
  });

  it('is idempotent across casing and never overwrites the stored name', async () => {
    await preregister(db, contact, NOW);
    await expect(
      preregister(db, { ...contact, firstName: 'Mallory', email: 'ada@EXAMPLE.com' }, LATER),
    ).resolves.toBe('unchanged');

    expect(fake.ids(WAITLIST_COLLECTION)).toHaveLength(1);
    expect(fake.read(WAITLIST_COLLECTION, sha256('ada@example.com'))?.firstName).toBe('Ada');
  });

  it('finds a legacy (random-id) entry by email with a query, not a scan, and only fills missing fields', async () => {
    fake.seed(WAITLIST_COLLECTION, 'legacyAutoId12345678', {
      firstName: 'Ada',
      lastName: '',
      email: 'Ada@Example.com',
      hasPreregistered: false,
      location: 'Unknown',
    });

    await expect(
      preregister(db, { ...contact, firstName: 'Mallory', lastName: 'Byron' }, NOW),
    ).resolves.toBe('updated');

    expect(fake.ids(WAITLIST_COLLECTION)).toEqual(['legacyAutoId12345678']);
    expect(fake.read(WAITLIST_COLLECTION, 'legacyAutoId12345678')).toMatchObject({
      firstName: 'Ada', // present — not replaced
      lastName: 'Byron', // missing — filled
      location: 'London, UK', // was Unknown — filled
      hasPreregistered: true,
    });
    expect(fake.collectionScans).toEqual([]);
  });
});

describe('submitQuestionnaire', () => {
  it('stores answered fields only, and only a HASH of the site-visit token', async () => {
    const { siteVisitToken } = await submitQuestionnaire(
      db,
      { ...contact, clientLocation: undefined, survey: COMPLETE_SURVEY },
      NOW,
    );

    const stored = fake.read(WAITLIST_COLLECTION, sha256('ada@example.com'))!;
    expect(stored.hasCompletedSurvey).toBe(true);
    expect(stored.surveyData).not.toHaveProperty('settlementMethodsOther');
    expect(stored.siteVisitTokenHash).toBe(sha256(siteVisitToken));
    expect(JSON.stringify(stored)).not.toContain(siteVisitToken);
    expect(fake.collectionScans).toEqual([]);
  });

  it('merges into an incomplete entry without replacing its name or erasing earlier answers', async () => {
    fake.seed(WAITLIST_COLLECTION, sha256('ada@example.com'), {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      hasPreregistered: true,
      hasCompletedSurvey: false,
      surveyData: { prefunding: 'No', prefundingWhy: 'Original reason' },
      location: 'London, UK',
    });

    await submitQuestionnaire(
      db,
      {
        ...contact,
        firstName: 'Mallory',
        clientLocation: undefined,
        survey: { prefunding: 'Yes', prefundingWhy: '', weeklySpend: '10' },
      },
      NOW,
    );

    const stored = fake.read(WAITLIST_COLLECTION, sha256('ada@example.com'))!;
    expect(stored.firstName).toBe('Ada');
    expect(stored.surveyData).toEqual({ prefunding: 'Yes', prefundingWhy: 'Original reason', weeklySpend: '10' });
  });

  it('leaves a completed questionnaire untouched but still answers with a token', async () => {
    const id = sha256('ada@example.com');
    const original = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      hasPreregistered: true,
      hasCompletedSurvey: true,
      surveyData: COMPLETE_SURVEY,
    };
    fake.seed(WAITLIST_COLLECTION, id, original);

    const { siteVisitToken } = await submitQuestionnaire(
      db,
      { ...contact, clientLocation: undefined, survey: { ...COMPLETE_SURVEY, prefunding: 'No' } },
      NOW,
    );

    expect(siteVisitToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(fake.read(WAITLIST_COLLECTION, id)).toEqual(original);
    expect(fake.writeCommits).toBe(0);
  });
});

describe('recordSiteVisit', () => {
  async function submitted() {
    const { siteVisitToken } = await submitQuestionnaire(
      db,
      { ...contact, clientLocation: undefined, survey: COMPLETE_SURVEY },
      NOW,
    );
    return siteVisitToken;
  }
  const id = () => sha256('ada@example.com');

  it('records the answer with the issued token, then consumes the token', async () => {
    const token = await submitted();

    await expect(
      recordSiteVisit(db, { email: 'ada@example.com', hasVisitedSite: true, siteVisitToken: token }, LATER),
    ).resolves.toBe(true);
    expect(fake.read(WAITLIST_COLLECTION, id())).toMatchObject({
      hasVisitedSite: true,
      siteVisitTokenHash: null,
      siteVisitTokenExpiresAt: null,
    });

    // Single use.
    await expect(
      recordSiteVisit(db, { email: 'ada@example.com', hasVisitedSite: false, siteVisitToken: token }, LATER),
    ).resolves.toBe(false);
    expect(fake.read(WAITLIST_COLLECTION, id())?.hasVisitedSite).toBe(true);
  });

  it('ignores a missing, wrong, or expired token', async () => {
    const token = await submitted();
    const expired = new Date(NOW.getTime() + SITE_VISIT_TOKEN_TTL_MS + 1);

    await expect(recordSiteVisit(db, { email: 'ada@example.com', hasVisitedSite: true }, LATER)).resolves.toBe(false);
    await expect(
      recordSiteVisit(db, { email: 'ada@example.com', hasVisitedSite: true, siteVisitToken: 'x'.repeat(43) }, LATER),
    ).resolves.toBe(false);
    await expect(
      recordSiteVisit(db, { email: 'ada@example.com', hasVisitedSite: true, siteVisitToken: token }, expired),
    ).resolves.toBe(false);
    expect(fake.read(WAITLIST_COLLECTION, id())).not.toHaveProperty('hasVisitedSite');
  });

  it('never changes an answer that is already recorded', async () => {
    const token = await submitted();
    fake.seed(WAITLIST_COLLECTION, id(), { ...fake.read(WAITLIST_COLLECTION, id()), hasVisitedSite: false });

    await recordSiteVisit(db, { email: 'ada@example.com', hasVisitedSite: true, siteVisitToken: token }, LATER);
    expect(fake.read(WAITLIST_COLLECTION, id())?.hasVisitedSite).toBe(false);
  });

  it('does nothing for an address that is not on the list', async () => {
    await expect(
      recordSiteVisit(db, { email: 'nobody@example.com', hasVisitedSite: true, siteVisitToken: 'abc' }, NOW),
    ).resolves.toBe(false);
    expect(fake.ids(WAITLIST_COLLECTION)).toEqual([]);
  });
});

describe('admin reads and deletes', () => {
  it('projects documents onto an allowlist — no token hash, no unknown fields', () => {
    const entry = toWaitlistEntry('abc', {
      firstName: 'Ada',
      email: 'ada@example.com',
      siteVisitTokenHash: 'deadbeef',
      siteVisitTokenExpiresAt: NOW.toISOString(),
      isAdmin: true,
      surveyData: { prefunding: 'Yes', splitTypes: ['Food & drinks', 7], junk: { nested: true } },
    });

    expect(entry).toEqual({
      id: 'abc',
      firstName: 'Ada',
      lastName: '',
      email: 'ada@example.com',
      location: undefined,
      submittedAt: undefined,
      hasPreregistered: undefined,
      hasCompletedSurvey: undefined,
      hasVisitedSite: undefined,
      surveyData: { prefunding: 'Yes', splitTypes: ['Food & drinks'] },
    });
  });

  it('lists newest first', async () => {
    fake.seed(WAITLIST_COLLECTION, 'old', { email: 'a@x.co', submittedAt: '2026-01-01T00:00:00.000Z' });
    fake.seed(WAITLIST_COLLECTION, 'new', { email: 'b@x.co', submittedAt: '2026-06-01T00:00:00.000Z' });

    const entries = await listWaitlistEntries(db);
    expect(entries.map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('deletes an entry and records who did it, without the deleted person’s data', async () => {
    fake.seed(WAITLIST_COLLECTION, 'victim', { email: 'ada@example.com', firstName: 'Ada' });

    await expect(deleteWaitlistEntry(db, 'victim', 'admin-user-1', NOW)).resolves.toBe(true);
    expect(fake.read(WAITLIST_COLLECTION, 'victim')).toBeUndefined();

    const [recordId] = fake.ids(WAITLIST_DELETIONS_COLLECTION);
    expect(fake.read(WAITLIST_DELETIONS_COLLECTION, recordId)).toEqual({
      entryId: 'victim',
      deletedAt: NOW.toISOString(),
      deletedBy: 'admin-user-1',
    });
  });

  it('reports a missing entry without writing anything', async () => {
    await expect(deleteWaitlistEntry(db, 'nope', 'admin-user-1', NOW)).resolves.toBe(false);
    expect(fake.ids(WAITLIST_DELETIONS_COLLECTION)).toEqual([]);
  });
});
