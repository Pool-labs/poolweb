/**
 * Size limits for waitlist submissions. Client-safe (no dependencies), so the
 * forms can use the same numbers the server enforces (`schema.ts`).
 */
export const WAITLIST_LIMITS = {
  /** Whole request body, checked before parsing. */
  MAX_BODY_BYTES: 64 * 1024,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_LOCATION_LENGTH: 200,
  MAX_LONG_ANSWER_LENGTH: 5000,
  MAX_SHORT_ANSWER_LENGTH: 500,
  MAX_CHOICE_LENGTH: 200,
  MAX_CHOICES: 10,
  MAX_TOKEN_LENGTH: 128,
} as const;
