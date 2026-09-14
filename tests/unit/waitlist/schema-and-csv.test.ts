import { describe, expect, it } from 'vitest';

import { csvCell, csvRow, toCsv } from '@/lib/waitlist/csv';
import { isQuestionnaireComplete } from '@/lib/waitlist/questionnaire';
import {
  preregisterSchema,
  questionnaireSchema,
  siteVisitSchema,
  WAITLIST_LIMITS,
  waitlistEntryIdSchema,
} from '@/lib/waitlist/schema';

const contact = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };

describe('preregisterSchema', () => {
  it('accepts a normal signup and trims it', () => {
    expect(preregisterSchema.parse({ ...contact, firstName: '  Ada ', clientLocation: 'London' })).toEqual({
      ...contact,
      clientLocation: 'London',
    });
  });

  it.each([
    ['a missing name', { ...contact, firstName: '' }],
    ['a whitespace-only name', { ...contact, lastName: '   ' }],
    ['an over-long name', { ...contact, firstName: 'a'.repeat(WAITLIST_LIMITS.MAX_NAME_LENGTH + 1) }],
    ['a malformed email', { ...contact, email: 'almost@valid' }],
    ['a non-string email', { ...contact, email: ['ada@example.com'] }],
  ])('refuses %s', (_label, body) => {
    expect(preregisterSchema.safeParse(body).success).toBe(false);
  });

  it('drops an over-long client location instead of refusing the signup', () => {
    const parsed = preregisterSchema.parse({ ...contact, clientLocation: 'x'.repeat(5000) });
    expect(parsed.clientLocation).toBeUndefined();
  });
});

describe('questionnaireSchema', () => {
  it('keeps only live-questionnaire fields — no way to set flags or arbitrary keys', () => {
    const parsed = questionnaireSchema.parse({
      ...contact,
      prefunding: 'Yes',
      hasCompletedSurvey: true,
      hasVisitedSite: true,
      surveyData: { injected: true },
      isAdmin: true,
      hangoutFrequency: 'Weekly', // legacy key from old saved progress: dropped, not refused
    });

    expect(Object.keys(parsed).sort()).toEqual(['clientLocation', 'email', 'firstName', 'lastName', 'survey']);
    expect(parsed.survey).not.toHaveProperty('hasCompletedSurvey');
    expect(parsed.survey).not.toHaveProperty('hangoutFrequency');
    expect(parsed.survey.prefunding).toBe('Yes');
  });

  it('keeps only answers the form offers for choice questions', () => {
    const parsed = questionnaireSchema.parse({
      ...contact,
      prefunding: '=HYPERLINK("x")',
      settlementMethods: ['Split the check', 'Something invented', 'Split the check'],
    });
    expect(parsed.survey.prefunding).toBe('');
    expect(parsed.survey.settlementMethods).toEqual(['Split the check']);
  });

  it('refuses over-long free text and oversized choice lists', () => {
    expect(
      questionnaireSchema.safeParse({ ...contact, prefundingWhy: 'a'.repeat(WAITLIST_LIMITS.MAX_LONG_ANSWER_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(
      questionnaireSchema.safeParse({ ...contact, splitTypes: Array(WAITLIST_LIMITS.MAX_CHOICES + 1).fill('Other') })
        .success,
    ).toBe(false);
  });

  it('still needs contact details', () => {
    expect(questionnaireSchema.safeParse({ prefunding: 'Yes' }).success).toBe(false);
  });
});

describe('siteVisitSchema and entry ids', () => {
  it('requires a boolean answer and a well-formed optional token', () => {
    expect(siteVisitSchema.safeParse({ email: contact.email, hasVisitedSite: 'yes' }).success).toBe(false);
    expect(siteVisitSchema.safeParse({ email: contact.email, hasVisitedSite: true }).success).toBe(true);
    expect(
      siteVisitSchema.safeParse({ email: contact.email, hasVisitedSite: true, siteVisitToken: 'a/b' }).success,
    ).toBe(false);
  });

  it('accepts Firestore auto ids and sha256 ids, nothing path-like', () => {
    expect(waitlistEntryIdSchema.safeParse('Ab3dEf6hIj9kLm2nOp5q').success).toBe(true);
    expect(waitlistEntryIdSchema.safeParse('a'.repeat(64)).success).toBe(true);
    for (const bad of ['', '..', 'a/b', 'a'.repeat(129), 'x%2Fy']) {
      expect(waitlistEntryIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('isQuestionnaireComplete', () => {
  it('requires the "Other" detail when Other is chosen', () => {
    const base = {
      prefunding: 'Yes',
      prefundingWhy: 'x',
      settlementMethods: ['Other'],
      settlementFeedback: 'x',
      moneyInAir: '$0-$50',
      weeklySpend: '5',
      splitTypes: ['Rent/bills'],
      hangoutPoolWillingness: 'Both',
      socialFeatures: ['None'],
      friendConversion: 'Pretty hard',
    };
    expect(isQuestionnaireComplete(base)).toBe(false);
    expect(isQuestionnaireComplete({ ...base, settlementMethodsOther: 'Cash' })).toBe(true);
    expect(isQuestionnaireComplete(null)).toBe(false);
  });
});

describe('CSV export encoding', () => {
  it.each(['=HYPERLINK("https://example.test","x")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd'])(
    'neutralises a cell starting with a formula trigger: %j',
    (value) => {
      expect(csvCell(value).startsWith(`"'`)).toBe(true);
    },
  );

  it('doubles embedded quotes so a value cannot break out of its cell', () => {
    expect(csvCell('a","=1')).toBe('"a"",""=1"');
  });

  it('leaves ordinary values alone', () => {
    expect(csvCell('Ada Lovelace')).toBe('"Ada Lovelace"');
    expect(csvCell(42)).toBe('"42"');
    expect(csvCell(undefined)).toBe('""');
    expect(csvRow(['a', 'b'])).toBe('"a","b"');
    expect(toCsv([['h'], ['=x']])).toBe(`"h"\r\n"'=x"`);
  });
});
