import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  DocumentData,
  DocumentReference,
  Firestore,
  Transaction,
} from 'firebase-admin/firestore';

import { answeredOnly, isQuestionnaireComplete } from './questionnaire';
import type { PreregisterInput, QuestionnaireInput, SiteVisitInput } from './schema';
import {
  WAITLIST_COLLECTION,
  WAITLIST_DELETIONS_COLLECTION,
  type SurveyAnswer,
  type SurveyData,
  type WaitlistEntry,
} from './types';

/**
 * Every Firestore read and write of the marketing waitlist.
 *
 * Callers pass the Admin-SDK Firestore in (`getAdminFirestore()`); nothing here
 * reaches for a client or a global, so the rules can deny all client access.
 *
 * LOOKUPS ARE POINT READS, NEVER A COLLECTION SCAN. New entries are keyed by
 * `waitlistDocId(normalizedEmail)`, so finding one is a single document read.
 * Entries created before this keying have random ids; for those there is a
 * fallback equality query on the stored `email` (limit 1). Neither path lists
 * the collection — only the platform-admin list does that.
 *
 * UNAUTHENTICATED CALLERS NEVER OVERWRITE WHO SOMEONE IS. Nothing proves the
 * submitter owns the email they typed, so a submission can FILL an empty name
 * or location on an existing entry but never replace one, and answers are
 * merged without letting an empty answer erase an earlier one.
 */

/** How long the one-time site-visit token from a questionnaire submission stays usable. */
export const SITE_VISIT_TOKEN_TTL_MS = 60 * 60 * 1000;

const UNKNOWN_LOCATION = 'Unknown';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The document id for an email: sha256 of its normalized form, hex. */
export function waitlistDocId(email: string): string {
  return sha256Hex(normalizeEmail(email));
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

interface FoundEntry {
  ref: DocumentReference;
  data: DocumentData;
}

/**
 * Find the entry for an email inside a transaction.
 *
 * 1. The deterministic id (entries written since the Admin-SDK move).
 * 2. Legacy entries: `email ==` the address as typed, or lowercased. Earlier
 *    forms stored whatever casing the visitor used, so both are tried.
 */
async function findEntry(db: Firestore, tx: Transaction, email: string): Promise<FoundEntry | null> {
  const collection = db.collection(WAITLIST_COLLECTION);
  const keyedRef = collection.doc(waitlistDocId(email));
  const keyed = await tx.get(keyedRef);
  if (keyed.exists) return { ref: keyedRef, data: keyed.data() ?? {} };

  const candidates = Array.from(new Set([email.trim(), normalizeEmail(email)]));
  const legacy = await tx.get(collection.where('email', 'in', candidates).limit(1));
  if (!legacy.empty) {
    const doc = legacy.docs[0];
    return { ref: doc.ref, data: doc.data() };
  }
  return null;
}

/** Name/location fields to set on an existing entry: only ones it does not already have. */
function fillMissingIdentity(
  existing: DocumentData,
  input: { firstName: string; lastName: string; location: string },
): Record<string, string> {
  const patch: Record<string, string> = {};
  if (!isNonEmptyString(existing.firstName)) patch.firstName = input.firstName;
  if (!isNonEmptyString(existing.lastName)) patch.lastName = input.lastName;
  const hasLocation = isNonEmptyString(existing.location) && existing.location !== UNKNOWN_LOCATION;
  if (!hasLocation && input.location !== UNKNOWN_LOCATION) patch.location = input.location;
  return patch;
}

function storedSurvey(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export type PreregisterOutcome = 'created' | 'updated' | 'unchanged';

/**
 * Add an email to the waitlist, idempotently.
 *
 * The caller answers every outcome identically, so the response never reveals
 * whether an address was already on the list.
 */
export async function preregister(
  db: Firestore,
  input: PreregisterInput & { location: string },
  now: Date,
): Promise<PreregisterOutcome> {
  return db.runTransaction(async (tx) => {
    const existing = await findEntry(db, tx, input.email);

    if (!existing) {
      tx.create(db.collection(WAITLIST_COLLECTION).doc(waitlistDocId(input.email)), {
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizeEmail(input.email),
        hasPreregistered: true,
        hasCompletedSurvey: false,
        surveyData: {},
        location: input.location,
        submittedAt: now.toISOString(),
      });
      return 'created';
    }

    if (existing.data.hasPreregistered === true) return 'unchanged';

    // Known from the questionnaire but not yet preregistered.
    tx.update(existing.ref, {
      ...fillMissingIdentity(existing.data, input),
      hasPreregistered: true,
      submittedAt: isNonEmptyString(existing.data.submittedAt)
        ? existing.data.submittedAt
        : now.toISOString(),
    });
    return 'updated';
  });
}

/**
 * Record questionnaire answers and issue a one-time site-visit token.
 *
 * The token (returned to the submitter, stored only as a sha256 hash) is what
 * `recordSiteVisit` requires, so answering the follow-up "have you visited the
 * site?" question needs this submission's response, not merely the email.
 *
 * An entry whose questionnaire is already complete is left untouched. The
 * submitter still receives a token of the same shape, which simply matches
 * nothing — so the response is identical whether the address was new, known,
 * or already done.
 */
export async function submitQuestionnaire(
  db: Firestore,
  input: QuestionnaireInput & { location: string },
  now: Date,
): Promise<{ siteVisitToken: string }> {
  const siteVisitToken = randomBytes(32).toString('base64url');
  const tokenFields = {
    siteVisitTokenHash: sha256Hex(siteVisitToken),
    siteVisitTokenExpiresAt: new Date(now.getTime() + SITE_VISIT_TOKEN_TTL_MS).toISOString(),
  };
  const answers = answeredOnly(input.survey);

  await db.runTransaction(async (tx) => {
    const existing = await findEntry(db, tx, input.email);

    if (!existing) {
      tx.create(db.collection(WAITLIST_COLLECTION).doc(waitlistDocId(input.email)), {
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizeEmail(input.email),
        // Submitting the questionnaire counts as preregistering for early access.
        hasPreregistered: true,
        hasCompletedSurvey: isQuestionnaireComplete(answers),
        surveyData: answers,
        location: input.location,
        submittedAt: now.toISOString(),
        ...tokenFields,
      });
      return;
    }

    const previous = storedSurvey(existing.data.surveyData);
    if (existing.data.hasCompletedSurvey === true && isQuestionnaireComplete(previous)) return;

    const merged = { ...previous, ...answers };
    tx.update(existing.ref, {
      ...fillMissingIdentity(existing.data, input),
      surveyData: merged,
      hasCompletedSurvey: isQuestionnaireComplete(merged),
      hasPreregistered: true,
      submittedAt: now.toISOString(),
      ...tokenFields,
    });
  });

  return { siteVisitToken };
}

function tokenMatches(storedHashHex: string, presentedToken: string): boolean {
  const presented = Buffer.from(sha256Hex(presentedToken), 'hex');
  const stored = Buffer.from(storedHashHex, 'hex');
  return stored.length === presented.length && timingSafeEqual(stored, presented);
}

/**
 * Answer the follow-up site-visit question.
 *
 * Applies only with a valid, unexpired token from this entry's latest
 * questionnaire submission; the token is consumed either way it matches. An
 * answer that is already recorded is never changed. Returns whether anything
 * was written; the route answers the same regardless.
 */
export async function recordSiteVisit(db: Firestore, input: SiteVisitInput, now: Date): Promise<boolean> {
  const token = input.siteVisitToken;
  if (!token) return false;

  return db.runTransaction(async (tx) => {
    const existing = await findEntry(db, tx, input.email);
    if (!existing) return false;

    const { siteVisitTokenHash, siteVisitTokenExpiresAt } = existing.data;
    if (typeof siteVisitTokenHash !== 'string' || typeof siteVisitTokenExpiresAt !== 'string') return false;
    if (!(Date.parse(siteVisitTokenExpiresAt) > now.getTime())) return false;
    if (!tokenMatches(siteVisitTokenHash, token)) return false;

    tx.update(existing.ref, {
      siteVisitTokenHash: null,
      siteVisitTokenExpiresAt: null,
      ...(typeof existing.data.hasVisitedSite === 'boolean' ? {} : { hasVisitedSite: input.hasVisitedSite }),
    });
    return true;
  });
}

function toSurveyData(value: unknown): SurveyData | undefined {
  const raw = storedSurvey(value);
  const out: SurveyData = {};
  for (const [key, answer] of Object.entries(raw)) {
    if (typeof answer === 'string') out[key] = answer;
    else if (Array.isArray(answer)) {
      out[key] = answer.filter((v): v is string => typeof v === 'string') as SurveyAnswer;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Project a stored document onto the admin DTO. An explicit allowlist, so the
 * site-visit token hash (and any field added later) never reaches the browser.
 */
export function toWaitlistEntry(id: string, data: DocumentData): WaitlistEntry {
  const optionalString = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const optionalBoolean = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
  return {
    id,
    firstName: optionalString(data.firstName) ?? '',
    lastName: optionalString(data.lastName) ?? '',
    email: optionalString(data.email) ?? '',
    location: optionalString(data.location),
    submittedAt: optionalString(data.submittedAt),
    hasPreregistered: optionalBoolean(data.hasPreregistered),
    hasCompletedSurvey: optionalBoolean(data.hasCompletedSurvey),
    hasVisitedSite: optionalBoolean(data.hasVisitedSite),
    surveyData: toSurveyData(data.surveyData),
  };
}

/** Every waitlist entry, newest first. Platform-admin only. */
export async function listWaitlistEntries(db: Firestore): Promise<WaitlistEntry[]> {
  const snapshot = await db.collection(WAITLIST_COLLECTION).get();
  const entries = snapshot.docs.map((doc) => toWaitlistEntry(doc.id, doc.data()));
  const time = (e: WaitlistEntry) => (e.submittedAt ? Date.parse(e.submittedAt) || 0 : 0);
  return entries.sort((a, b) => time(b) - time(a));
}

/**
 * Delete one entry and record that it happened, atomically. Platform-admin
 * only. The deletion record holds the entry id, the time and the Pool user id
 * of the admin — nothing about the person whose data was removed.
 *
 * @returns false when there was no such entry.
 */
export async function deleteWaitlistEntry(
  db: Firestore,
  entryId: string,
  deletedBy: string | null,
  now: Date,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const ref = db.collection(WAITLIST_COLLECTION).doc(entryId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return false;

    tx.delete(ref);
    tx.create(db.collection(WAITLIST_DELETIONS_COLLECTION).doc(), {
      entryId,
      deletedAt: now.toISOString(),
      deletedBy,
    });
    return true;
  });
}
