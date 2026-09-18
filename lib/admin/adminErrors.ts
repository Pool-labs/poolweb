import { AdminApiError } from './adminApi';

/**
 * Words for a failed admin WRITE (poolweb#46).
 *
 * The house rule this implements is poolmobile#145's: **the server sends a
 * status, the dashboard owns the sentence.** Rendering a raw upstream message
 * is how a founder ends up reading "Request failed (404)" and concluding the
 * dashboard is broken.
 *
 * ⚠️ THE 404 IS THE WHOLE REASON THIS FILE EXISTS, AND IT IS NOT HYPOTHETICAL.
 * `POST /admin/users` and `POST /admin/pools` do not exist on any environment
 * as of 2026-09-18 (poolmobile#684) — the admin API can suspend, restore, flag,
 * adjust and impersonate, but it cannot create. So today every create attempt
 * takes this path, and the difference between "this API version cannot do this
 * yet, and nothing was created" and a generic failure is the difference between
 * a founder waiting for a deploy and a founder filing a bug against this repo.
 *
 * It also self-heals: the moment the endpoint ships, the same code renders the
 * real outcome with nothing to change here.
 */

/** What was being created — used in the sentence, so keep it a plain noun. */
export type CreateTarget = 'user' | 'pool';

const TARGET_PLURAL: Record<CreateTarget, string> = {
  user: 'users',
  pool: 'pools',
};

export interface CreateFailure {
  /** One sentence, already addressed to a founder. */
  message: string;
  /**
   * True when the endpoint is simply not deployed — the caller renders this
   * differently (an explanation, not a red error), because nothing went wrong
   * with what the founder typed.
   */
  notServedYet: boolean;
}

/**
 * Turn a thrown error into words.
 *
 * ⚠️ Every branch states whether anything was WRITTEN, because that is the only
 * question a founder actually has after a failed create. A message that leaves
 * it open invites a retry that creates a duplicate.
 */
export function describeCreateFailure(error: unknown, target: CreateTarget): CreateFailure {
  if (error instanceof AdminApiError) {
    switch (error.status) {
      case 404:
      case 405:
      case 501:
        return {
          notServedYet: true,
          message:
            `This environment's API cannot create ${TARGET_PLURAL[target]} yet — the endpoint ` +
            `does not exist on it (tracked as poolmobile#684). Nothing was created, and nothing ` +
            `you typed was wrong.`,
        };
      case 400:
      case 422:
        // The server validated and refused. Its own message is the useful one
        // here — it names the field — so it is passed through deliberately.
        return {
          notServedYet: false,
          message: `${error.message} Nothing was created.`,
        };
      case 403:
        return {
          notServedYet: false,
          message:
            `This session is not allowed to create ${TARGET_PLURAL[target]} on this environment. ` +
            `Nothing was created.`,
        };
      case 409:
        return {
          notServedYet: false,
          message: `${error.message} Nothing was created.`,
        };
      case 429:
        return {
          notServedYet: false,
          message:
            'Too many admin writes in a short window. Wait a moment and try again — nothing was created.',
        };
      case 502:
      case 503:
      case 504:
        // ⚠️ DELIBERATELY DOES NOT SAY "nothing was created". A gateway timeout
        // means the request may well have completed upstream; telling somebody
        // it failed is how a duplicate gets made on the retry.
        return {
          notServedYet: false,
          message:
            `The API did not answer in time. It may still have created the ${target} — ` +
            `refresh the list and check before trying again.`,
        };
      default:
        return {
          notServedYet: false,
          message: `${error.message} Nothing was created.`,
        };
    }
  }

  if (error instanceof Error && error.message) {
    return { notServedYet: false, message: `${error.message} Nothing was created.` };
  }

  return {
    notServedYet: false,
    message: `Could not create the ${target}. Nothing was created.`,
  };
}
