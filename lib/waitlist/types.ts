/**
 * Waitlist data shapes shared by the server store and the admin screens.
 *
 * Client-safe: types only. The Firestore document can carry more than this
 * (the one-time site-visit token hash, for instance); the admin API projects
 * each document down to `WaitlistEntry` explicitly, so a field added to the
 * document later is not published to the dashboard by accident.
 */

/** Firestore collection holding the marketing waitlist. */
export const WAITLIST_COLLECTION = 'preregistered_users';

/** Append-only record of every admin deletion from the waitlist. */
export const WAITLIST_DELETIONS_COLLECTION = 'waitlist_deletions';

/**
 * A stored questionnaire answer: free text, a single choice, or several
 * choices. Records from older questionnaire versions carry other keys (see
 * `LEGACY_META`), so this is a map rather than a closed interface.
 */
export type SurveyAnswer = string | string[];
export type SurveyData = Record<string, SurveyAnswer>;

/** One waitlist signup as the admin dashboard sees it. */
export interface WaitlistEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  location?: string;
  submittedAt?: string;
  hasPreregistered?: boolean;
  hasCompletedSurvey?: boolean;
  hasVisitedSite?: boolean;
  surveyData?: SurveyData;
}
