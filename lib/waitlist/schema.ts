import { z } from 'zod';

import { QUESTIONNAIRE_OPTIONS } from '@/lib/questionnaire-questions';
import { WAITLIST_LIMITS } from './limits';
import type { SurveyData } from './types';

/**
 * Request-body schemas for the three public waitlist routes.
 *
 * Each schema is an ALLOWLIST: keys it does not name are stripped (Zod's
 * default), so a request cannot add arbitrary fields to a stored document.
 * Unknown keys are stripped rather than refused because a returning visitor's
 * saved questionnaire progress (localStorage) can still carry fields from an
 * older questionnaire version, and refusing those would leave them unable to
 * submit at all.
 *
 * Every stored value is bounded, but nothing a visitor can type into the
 * forms is REFUSED for its length or shape — a refusal the form did not warn
 * about is an error they can never get past by retrying. So:
 *  - over-long names and answers are cut to their limit (the questionnaire's
 *    text fields also carry `maxLength`, so in practice nothing is cut);
 *  - choice questions keep only the values the form offers
 *    (`QUESTIONNAIRE_OPTIONS`) — anything else is dropped, not stored;
 *  - the email rule is the forms' own shape rule (text@text.text, no spaces),
 *    so internationalised addresses are accepted.
 * The whole body is capped (`MAX_BODY_BYTES`) before any of this runs.
 */

export { WAITLIST_LIMITS };

/** Cut to at most `max` characters without splitting a surrogate pair. */
function truncate(value: string, max: number): string {
  return value.length <= max ? value : Array.from(value).slice(0, max).join('');
}

const name = z
  .string()
  .trim()
  .min(1)
  .transform((v) => truncate(v, WAITLIST_LIMITS.MAX_NAME_LENGTH));

/**
 * Trimmed, as typed; the store derives the normalized form. Same shape rule as
 * the forms (one `@`, no whitespace, a dot in the domain).
 */
const email = z
  .string()
  .trim()
  .max(WAITLIST_LIMITS.MAX_EMAIL_LENGTH)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

const clientLocation = z
  .string()
  .trim()
  .max(WAITLIST_LIMITS.MAX_LOCATION_LENGTH)
  .optional()
  .catch(undefined);

function answer(max: number) {
  return z
    .string()
    .optional()
    .transform((v) => truncate((v ?? '').trim(), max));
}

function singleChoice(options: readonly string[]) {
  return z.unknown().transform((v) => (typeof v === 'string' && options.includes(v) ? v : ''));
}

function multiChoice(options: readonly string[]) {
  return z
    .unknown()
    .transform((v) =>
      Array.isArray(v)
        ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && options.includes(x))))
        : [],
    );
}

const LONG = WAITLIST_LIMITS.MAX_LONG_ANSWER_LENGTH;
const SHORT = WAITLIST_LIMITS.MAX_SHORT_ANSWER_LENGTH;

/** The live questionnaire's answers. Keys match `CURRENT_META`. */
const surveySchema = z.object({
  prefunding: singleChoice(QUESTIONNAIRE_OPTIONS.prefunding),
  prefundingWhy: answer(LONG),
  settlementMethods: multiChoice(QUESTIONNAIRE_OPTIONS.settlementMethods),
  settlementMethodsOther: answer(SHORT),
  settlementFeedback: answer(LONG),
  moneyInAir: singleChoice(QUESTIONNAIRE_OPTIONS.moneyInAir),
  moneyInAirAmount: answer(SHORT),
  weeklySpend: answer(32),
  splitTypes: multiChoice(QUESTIONNAIRE_OPTIONS.splitTypes),
  splitTypesOther: answer(SHORT),
  hangoutPoolWillingness: singleChoice(QUESTIONNAIRE_OPTIONS.hangoutPoolWillingness),
  hangoutPoolWhy: answer(LONG),
  socialFeatures: multiChoice(QUESTIONNAIRE_OPTIONS.socialFeatures),
  socialFeaturesOther: answer(SHORT),
  friendConversion: singleChoice(QUESTIONNAIRE_OPTIONS.friendConversion),
});

export const preregisterSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  clientLocation,
});

export type PreregisterInput = z.infer<typeof preregisterSchema>;

/**
 * The questionnaire posts its contact fields and its answers in one flat
 * object; this splits them so the answers can never be read as identity
 * fields (or vice versa).
 */
export const questionnaireSchema = surveySchema
  .extend({
    firstName: name,
    lastName: name,
    email,
    clientLocation,
  })
  .transform(({ firstName, lastName, email, clientLocation, ...survey }) => ({
    firstName,
    lastName,
    email,
    clientLocation,
    survey: survey as SurveyData,
  }));

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;

export const siteVisitSchema = z.object({
  email,
  hasVisitedSite: z.boolean(),
  /**
   * The one-time token the questionnaire response issued. Optional so a page
   * loaded before this change (which never sends one) gets a harmless no-op
   * instead of an error.
   */
  siteVisitToken: z
    .string()
    .max(WAITLIST_LIMITS.MAX_TOKEN_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
});

export type SiteVisitInput = z.infer<typeof siteVisitSchema>;

/** Firestore document ids the admin API will act on: auto-ids and our sha256 ids. */
export const waitlistEntryIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
