'use client';

import { AlertTriangle, FlaskConical, Laptop } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  ENV_BANNER,
  ENV_DESCRIPTIONS,
  ENV_LABELS,
  isDangerousEnv,
  type ApiEnv,
} from '@/lib/admin/adminEnv';
import { EnvSwitcher } from './EnvSwitcher';

/**
 * The environment strip (#14) — the FIRST thing on every admin page, including
 * the login screen.
 *
 * #112 built the switch and gave it a badge in the nav row. The Phase-10
 * walkthrough found the badge easy to miss and the switch effectively buried:
 * it sat at the far end of a nav bar, in the same visual weight as everything
 * else, and on the login page it appeared only once a client fetch resolved —
 * which is precisely the screen where being in the wrong environment costs you
 * an OTP that can never verify (admin allowlists and codes are per-environment).
 *
 * So this component makes three deliberate changes:
 *
 *  1. **It is a full-width strip, not a pill.** Colour-coded by consequence —
 *     production solid red, staging amber, local muted — and it says what the
 *     environment MEANS ("real users and real money" / "test data only") rather
 *     than only what it is called. A founder should never have to remember what
 *     the word "staging" implies at the moment they are about to act.
 *  2. **It is rendered on EVERY page, login included**, from the admin layout,
 *     which resolves the environment SERVER-side from the httpOnly cookie. The
 *     login screen no longer waits on a client fetch to say where it is.
 *  3. **The switch lives here, labelled.** There is now exactly ONE switcher in
 *     the whole dashboard, at the top of the page, under the words "Switch to" —
 *     not a second copy in the nav and a third on the login card.
 *
 * It renders nothing itself about SESSIONS; `EnvSwitcher` keeps its own
 * behaviour, including the confirmation step that guards a switch INTO
 * production.
 */
export function EnvBanner({
  env,
  availableEnvs,
  authenticatedEnvs,
}: {
  env: ApiEnv;
  availableEnvs: ApiEnv[];
  authenticatedEnvs: ApiEnv[];
}) {
  const tone = ENV_BANNER[env];
  const Icon = env === 'production' ? AlertTriangle : env === 'staging' ? FlaskConical : Laptop;

  return (
    <div
      className={cn(tone.className)}
      // A region rather than an alert: it is permanent context, not an
      // interruption (the #190 critical-alert banner is the interruption, and
      // deliberately looks like this one on production).
      role="region"
      aria-label={`Current Pool environment: ${ENV_LABELS[env]}`}
    >
      <div className="container mx-auto flex flex-col gap-2 px-4 py-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm leading-snug">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest opacity-80">
                You are on
              </span>
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-sm font-extrabold tracking-widest',
                  tone.labelClassName,
                )}
              >
                {ENV_LABELS[env]}
              </span>
              {isDangerousEnv(env) && (
                <span className="text-xs font-bold uppercase tracking-wide">
                  Handle with care
                </span>
              )}
            </p>
            <p className={cn('mt-0.5', tone.detailClassName)}>
              {tone.consequence} <span className="opacity-80">{ENV_DESCRIPTIONS[env]}</span>
            </p>
          </div>
        </div>

        {availableEnvs.length > 1 && (
          <div className="flex flex-col items-start gap-1 md:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-80">
              Switch to
            </span>
            <EnvSwitcher
              env={env}
              availableEnvs={availableEnvs}
              authenticatedEnvs={authenticatedEnvs}
            />
          </div>
        )}
      </div>
    </div>
  );
}
