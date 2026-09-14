import { z } from 'zod';

import { QUESTIONNAIRE_OPTIONS } from '@/lib/questionnaire-questions';
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
 * Bounds are generous for a human filling in the form and tight for anything
 * else. Choice questions keep only the values the form offers
 * (`QUESTIONNAIRE_OPTIONS`) — an unknown value is dropped, not stored.
 */

export const WAITLIST_LIMITS = {
  /** Whole request body, checked before parsing. */
  MAX_BODY_BYTES: 32 * 1024,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_LOCATION_LENGTH: 200,
  MAX_LONG_ANSWER_LENGTH: 5000,
  MAX_SHORT_ANSWER_LENGTH: 500,
  MAX_CHOICE_LENGTH: 200,
  MAX_CHOICES: 10,
  MAX_TOKEN_LENGTH: 128,
} as const;

const name = z.string().trim().min(1).max(WAITLIST_LIMITS.MAX_NAME_LENGTH);

/** Trimmed, as typed. The store derives the normalized form. */
const email = z.string().trim().max(WAITLIST_LIMITS.MAX_EMAIL_LENGTH).email();

const clientLocation = z
  .string()
  .trim()
  .max(WAITLIST_LIMITS.MAX_LOCATION_LENGTH)
  .optional()
  .catch(undefined);

function answer(max: number) {
  return z.string().max(max).optional().transform((v) => (v ?? '').trim());
}

function singleChoice(options: readonly string[]) {
  return z
    .string()
    .max(WAITLIST_LIMITS.MAX_CHOICE_LENGTH)
    .optional()
    .transform((v) => (v !== undefined && options.includes(v) ? v : ''));
}

function multiChoice(options: readonly string[]) {
  return z
    .array(z.string().max(WAITLIST_LIMITS.MAX_CHOICE_LENGTH))
    .max(WAITLIST_LIMITS.MAX_CHOICES)
    .optional()
    .transform((values) => Array.from(new Set((values ?? []).filter((v) => options.includes(v)))));
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
