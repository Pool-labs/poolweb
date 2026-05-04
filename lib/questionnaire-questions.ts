// Question metadata for the admin dashboard.
//
// We keep two independent maps:
//
// - CURRENT_META: the 8 questions on the live questionnaire today.
// - LEGACY_META:  every question that existed in any earlier version of the
//                 questionnaire, including the ones whose field name is reused
//                 by the current schema (e.g. `prefunding`, `splitTypes`). Those
//                 shared fields therefore appear in BOTH maps with their own
//                 numbering, so a single stored answer can render in both tabs
//                 of the admin details panel.

export type QuestionMeta = {
  order: number
  label: string
}

// ---- Current schema (live questionnaire) ----
export const CURRENT_META: Record<string, QuestionMeta> = {
  prefunding: {
    order: 1,
    label: '1. Would you pre-fund for activities?',
  },
  prefundingWhy: {
    order: 1.1,
    label: '   ↳ Why?',
  },
  settlementMethods: {
    order: 2,
    label: '2. How do you currently settle group expenses?',
  },
  settlementMethodsOther: {
    order: 2.1,
    label: '   ↳ Other (specify)',
  },
  settlementFeedback: {
    order: 2.2,
    label: '   ↳ What do you like or dislike about it?',
  },
  moneyInAir: {
    order: 3,
    label: '3. Is there money "in the air" — owed to you or by you to friends right now?',
  },
  moneyInAirAmount: {
    order: 3.1,
    label: '   ↳ Roughly how much?',
  },
  weeklySpend: {
    order: 4,
    label: '4. How much do you spend weekly with other people (friends, roommates, family, coworkers, etc.)?',
  },
  splitTypes: {
    order: 5,
    label: '5. What kinds of things do you usually split?',
  },
  splitTypesOther: {
    order: 5.1,
    label: '   ↳ Other (specify)',
  },
  hangoutPoolWillingness: {
    order: 6,
    label: '6. Willing to hang out with random people with similar interests AND pool money together?',
  },
  hangoutPoolWhy: {
    order: 6.1,
    label: '   ↳ Why?',
  },
  socialFeatures: {
    order: 7,
    label: '7. Which social features in a money app would you care about?',
  },
  socialFeaturesOther: {
    order: 7.1,
    label: '   ↳ Other (specify)',
  },
  friendConversion: {
    order: 8,
    label: '8. If you wanted friends to use POOL, how hard would it be to get them to join?',
  },
}

// ---- Legacy schema (every question that ever existed in older versions) ----
// Numbered chronologically across v1, v2, and v3-pre-Q2-split. Shared field
// names with the current schema are intentionally re-included here.
export const LEGACY_META: Record<string, QuestionMeta> = {
  hangoutFrequency: {
    order: 1,
    label: '1. How often do you hang out with friends?',
  },
  avgSpend: {
    order: 2,
    label: '2. On average, how much do you spend when you hang out?',
  },
  splitWith: {
    order: 3,
    label: '3. When you split expenses, who is it usually with?',
  },
  splitWithOther: {
    order: 3.1,
    label: '   ↳ Other (specify)',
  },
  splitTypes: {
    order: 4,
    label: '4. What kinds of things do you usually split?',
  },
  splitTypesOther: {
    order: 4.1,
    label: '   ↳ Other (specify)',
  },
  splitFrequency: {
    order: 5,
    label: '5. How often do you split payments with others?',
  },
  iouFrequency: {
    order: 6,
    label: '6. How often do you end up with IOUs?',
  },
  causesTension: {
    order: 7,
    label: '7. Do group expenses ever cause tension or awkwardness?',
  },
  currentTool: {
    order: 8,
    label: '8. What did you use to manage group expenses?',
  },
  toolLikes: {
    order: 9,
    label: '9. What did you like/dislike about that method?',
  },
  toolChanges: {
    order: 10,
    label: '10. What would you change (add/remove features)?',
  },
  tryNewApp: {
    order: 11,
    label: '11. Would you try a new app that fixes those issues?',
  },
  prefunding: {
    order: 12,
    label: '12. Would you pre-fund for activities?',
  },
  prefundingWhy: {
    order: 12.1,
    label: '   ↳ Why?',
  },
  valuableFeatures: {
    order: 13,
    label: '13. Which features would be most valuable to you?',
  },
  concerns: {
    order: 14,
    label: '14. Biggest concerns about a new app',
  },
  poolWithAcquaintance: {
    order: 15,
    label: '15. Would you pool money with an acquaintance for a shared trip/event?',
  },
  poolWithStranger: {
    order: 16,
    label: '16. Would you pool with a stranger sharing the same trip/goal?',
  },
  dailyRoutinePooling: {
    order: 17,
    label: '17. Open to pooling daily-routine spend (coffee, lunch, gym, rideshare)?',
  },
  discoveryInterest: {
    order: 18,
    label: '18. Want POOL to surface people with similar trips/budgets/interests?',
  },
  openPoolTypes: {
    order: 19,
    label: '19. Pool types open to with non-close-friends',
  },
  openPoolTypesOther: {
    order: 19.1,
    label: '   ↳ Other (specify)',
  },
  trustRequirements: {
    order: 20,
    label: '20. What would make you trust pooling money with someone you don\'t know well?',
  },
  settlementMethod: {
    order: 21,
    label: '21. How do you currently settle group expenses, and what do you like or dislike about it?',
  },
}

// Main field keys (sub-fields like splitTypesOther excluded so they don't
// inflate the "answered" count).
export const CURRENT_MAIN_FIELDS = [
  'prefunding',
  'settlementMethods',
  'moneyInAir',
  'weeklySpend',
  'splitTypes',
  'hangoutPoolWillingness',
  'socialFeatures',
  'friendConversion',
] as const

export const TOTAL_CURRENT_QUESTIONS = CURRENT_MAIN_FIELDS.length

// Fields that exist ONLY in the current schema (no overlap with any legacy
// version). Their presence on a record proves the user submitted via the
// current questionnaire — used to disambiguate shared field names like
// `prefunding` and `splitTypes`, which would otherwise inflate the "new"
// count for legacy submissions.
export const CURRENT_ONLY_FIELDS = [
  'settlementMethods',
  'moneyInAir',
  'weeklySpend',
  'hangoutPoolWillingness',
  'socialFeatures',
  'friendConversion',
] as const

export const LEGACY_MAIN_FIELDS = [
  'hangoutFrequency',
  'avgSpend',
  'splitWith',
  'splitTypes',
  'splitFrequency',
  'iouFrequency',
  'causesTension',
  'currentTool',
  'toolLikes',
  'toolChanges',
  'tryNewApp',
  'prefunding',
  'valuableFeatures',
  'concerns',
  'poolWithAcquaintance',
  'poolWithStranger',
  'dailyRoutinePooling',
  'discoveryInterest',
  'openPoolTypes',
  'trustRequirements',
  'settlementMethod',
] as const

export const TOTAL_LEGACY_QUESTIONS = LEGACY_MAIN_FIELDS.length

function isFilled(v: unknown): boolean {
  if (v == null) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

// True when the record contains at least one field that exists ONLY in the
// current schema — a reliable signal that the user actually went through the
// new questionnaire. Legacy records that happen to share a field name with
// the new schema (prefunding, splitTypes) are NOT treated as new submissions.
export function isNewSubmission(surveyData: any): boolean {
  if (!surveyData) return false
  return CURRENT_ONLY_FIELDS.some(k => isFilled(surveyData[k]))
}

export function countAnsweredQuestions(surveyData: any): {
  current: number
  legacy: number
} {
  if (!surveyData) return { current: 0, legacy: 0 }
  // A record belongs to one schema or the other — not both. Shared field
  // names like prefunding/splitTypes are attributed to whichever schema the
  // record was actually submitted under, never double-counted.
  if (isNewSubmission(surveyData)) {
    return {
      current: CURRENT_MAIN_FIELDS.filter(k => isFilled(surveyData[k])).length,
      legacy: 0,
    }
  }
  return {
    current: 0,
    legacy: LEGACY_MAIN_FIELDS.filter(k => isFilled(surveyData[k])).length,
  }
}

// Filter & sort survey-data entries for the given schema map.
export function entriesForSchema<T>(
  entries: [string, T][],
  schema: Record<string, QuestionMeta>,
): [string, T][] {
  return entries
    .filter(([k]) => k in schema)
    .sort(([a], [b]) => schema[a].order - schema[b].order)
}
