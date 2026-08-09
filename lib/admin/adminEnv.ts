/**
 * Environment identity for the platform-admin surface (poolmobile #112).
 *
 * CLIENT-SAFE by design: this module is pure — no `process.env`, no secrets, no
 * base URLs. It holds only the environment VOCABULARY (which environments
 * exist, what their cookies are called, how they must look), so it can be
 * imported by the nav (a client component), by `middleware.ts` (edge runtime)
 * and by the server-only `serverApi.ts` alike, and the three can never disagree
 * about what `"production"` means or which cookie holds its token.
 *
 * Anything that resolves an environment to an actual API base URL lives in
 * `serverApi.ts`, which is server-only.
 */

/**
 * Every environment the dashboard can be pointed at.
 *
 * Ordered deliberately: staging first. The switcher renders in this order, and
 * the LESS dangerous environment leads.
 */
export const API_ENVS = ['staging', 'production', 'local'] as const;

export type ApiEnv = (typeof API_ENVS)[number];

/** Narrow an untrusted string (a cookie value, a request body) to an ApiEnv. */
export function isApiEnv(value: unknown): value is ApiEnv {
  return typeof value === 'string' && (API_ENVS as readonly string[]).includes(value);
}

/**
 * The selected-environment cookie.
 *
 * It carries NO authority and NO secret — it is a routing preference that only
 * ever selects WHICH env-scoped token cookie and WHICH base URL the server
 * uses. Tampering with it cannot grant access: the session cookies are named
 * per environment, so pointing the proxy at production without a production
 * login simply yields a 401 → the login screen for production. That property is
 * the whole safety argument for this feature, and it is why the cookie can be
 * this boring.
 */
export const ADMIN_ENV_COOKIE = 'pool_admin_env';

/**
 * Suffix an env-scoped cookie name.
 *
 * ⚠️ THE INVARIANT THIS FEATURE RESTS ON: a Pool JWT is only valid for the
 * environment that issued it — a staging access token is meaningless against
 * production and vice versa. So sessions are not "switched", they are SEPARATE:
 * every token cookie is namespaced by environment, and there is deliberately no
 * code path anywhere that reads one environment's token and sends it to
 * another. Being logged into staging tells production nothing about you.
 */
export function envScopedCookie(baseName: string, env: ApiEnv): string {
  return `${baseName}__${env}`;
}

export const ENV_LABELS: Readonly<Record<ApiEnv, string>> = {
  staging: 'STAGING',
  production: 'PRODUCTION',
  local: 'LOCAL',
};

export const ENV_DESCRIPTIONS: Readonly<Record<ApiEnv, string>> = {
  staging: 'Beta + test data. Safe to poke at.',
  production: 'REAL users, real money, real consequences.',
  local: 'A Pool API running on this machine.',
};

/**
 * Badge presentation.
 *
 * PRODUCTION is deliberately the LOUDEST thing on the page — solid red, white
 * text, a ring. Before #112 the dashboard was single-environment and production
 * could afford a calm green "you are where you expect to be"; now that one
 * click moves you between real users and test data, the badge is the only thing
 * standing between a founder and reading staging numbers as production ones (or
 * worse, acting on production believing it is staging). Staging stays amber —
 * clearly "not production", but not alarming. Local is muted.
 */
export const ENV_BADGE: Readonly<
  Record<ApiEnv, { className: string; switcherActiveClassName: string }>
> = {
  production: {
    className:
      'bg-red-600 text-white border-red-700 ring-2 ring-red-500/40 shadow-sm dark:bg-red-600 dark:text-white',
    switcherActiveClassName: 'bg-red-600 text-white hover:bg-red-600',
  },
  staging: {
    className:
      'bg-amber-400/20 text-amber-700 dark:text-amber-400 border-amber-400/50',
    switcherActiveClassName: 'bg-amber-500 text-white hover:bg-amber-500',
  },
  local: {
    className: 'bg-muted text-muted-foreground border-border',
    switcherActiveClassName: 'bg-foreground text-background hover:bg-foreground',
  },
};

/**
 * The FULL-WIDTH banner presentation (#14).
 *
 * #112 shipped the badge and the segmented switcher, and the Phase-10 walkthrough
 * found both easy to miss — especially on the LOGIN screen, which renders outside
 * the admin shell and is the one moment where guessing wrong costs you an OTP and
 * a confused minute. So the environment is no longer a pill in a nav row: it is a
 * strip across the top of every admin page, login included, carrying the label,
 * the consequence, and the switch itself.
 *
 * Tone is the message. PRODUCTION is solid red with white text — the same chrome
 * the #190 critical-alert banner uses, deliberately, so a founder who has learned
 * that "solid red across the top" means "be careful" reads this the same way
 * without being taught twice. STAGING is amber: unmistakably not production, but
 * a colour you can look at all day. LOCAL is muted — nothing there can hurt
 * anyone.
 */
export const ENV_BANNER: Readonly<
  Record<
    ApiEnv,
    {
      /** The strip itself. */
      className: string;
      /** The "YOU ARE ON" eyebrow + label block. */
      labelClassName: string;
      /** Body copy sitting next to the label. */
      detailClassName: string;
      /** One line naming the stakes, in a founder's words rather than an ops team's. */
      consequence: string;
    }
  >
> = {
  production: {
    className: 'border-b-2 border-red-800 bg-red-600 text-white',
    labelClassName: 'bg-white/20 text-white',
    detailClassName: 'text-white/90',
    consequence: 'Everything you do here affects real users and real money.',
  },
  staging: {
    className:
      'border-b-2 border-amber-500 bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-amber-950',
    labelClassName: 'bg-amber-950/15 text-amber-950',
    detailClassName: 'text-amber-950/80',
    consequence: 'Test data only. Nothing here is a real user or real money.',
  },
  local: {
    className: 'border-b bg-muted text-foreground',
    labelClassName: 'bg-foreground/10 text-foreground',
    detailClassName: 'text-muted-foreground',
    consequence: 'A Pool API on this machine. Visible to nobody but you.',
  },
};

/**
 * Which environment a Pool API base URL denotes. PURE (takes the URL, reads no
 * `process.env`), so `middleware.ts` on the edge and the server-only
 * `serverApi.ts` can share ONE definition.
 *
 * ⚠️ Check staging FIRST — `api-staging.poolapp.co` contains
 * `api.poolapp.co` as a substring and must never be classified as production.
 */
export function classifyBaseUrl(base: string): ApiEnv {
  if (base.includes('api-staging.poolapp.co')) return 'staging';
  if (base.includes('api.poolapp.co')) return 'production';
  return 'local';
}

/** True for environments where a mistake is not recoverable. */
export function isDangerousEnv(env: ApiEnv): boolean {
  return env === 'production';
}
