import type { SurveyData } from './types';

/**
 * True when every question on the LIVE questionnaire has an answer.
 *
 * Mirrors the form's own completeness check (`checkIfFormDataComplete` in
 * app/questionnaire/page.tsx), written defensively because stored records can
 * hold anything an older questionnaire version wrote.
 */
export function isQuestionnaireComplete(survey: unknown): boolean {
  if (!survey || typeof survey !== 'object') return false;
  const s = survey as Record<string, unknown>;

  const text = (key: string): string => (typeof s[key] === 'string' ? (s[key] as string).trim() : '');
  const list = (key: string): string[] =>
    Array.isArray(s[key]) ? (s[key] as unknown[]).filter((v): v is string => typeof v === 'string') : [];

  // Q1 prefunding + why
  if (!text('prefunding') || !text('prefundingWhy')) return false;
  // Q2 settlement methods + feedback
  const settlementMethods = list('settlementMethods');
  if (settlementMethods.length === 0) return false;
  if (settlementMethods.includes('Other') && !text('settlementMethodsOther')) return false;
  if (!text('settlementFeedback')) return false;
  // Q3 money in the air
  if (!text('moneyInAir')) return false;
  // Q4 weekly spend
  if (!text('weeklySpend')) return false;
  // Q5 split types
  const splitTypes = list('splitTypes');
  if (splitTypes.length === 0) return false;
  if (splitTypes.includes('Other') && !text('splitTypesOther')) return false;
  // Q6 hangout/pool willingness (the "why" is optional)
  if (!text('hangoutPoolWillingness')) return false;
  // Q7 social features
  const socialFeatures = list('socialFeatures');
  if (socialFeatures.length === 0) return false;
  if (socialFeatures.includes('Other') && !text('socialFeaturesOther')) return false;
  // Q8 friend conversion
  if (!text('friendConversion')) return false;

  return true;
}

/** Drop unanswered fields, so merging a resubmission never erases an earlier answer. */
export function answeredOnly(survey: SurveyData): SurveyData {
  const out: SurveyData = {};
  for (const [key, value] of Object.entries(survey)) {
    if (Array.isArray(value) ? value.length > 0 : value.trim() !== '') out[key] = value;
  }
  return out;
}
