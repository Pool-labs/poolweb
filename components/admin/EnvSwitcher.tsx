'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ENV_BADGE,
  ENV_DESCRIPTIONS,
  ENV_LABELS,
  isDangerousEnv,
  type ApiEnv,
} from '@/lib/admin/adminEnv';

/**
 * Staging ⇄ Production switcher (poolmobile #112).
 *
 * A segmented control rather than a dropdown, deliberately: which environment
 * you are in must be readable at a glance without opening anything, and the
 * available set is two or three items.
 *
 * Switching into PRODUCTION requires a confirmation. Every other environment
 * switches on the first click. The asymmetry is the point — production is the
 * one where reading a number wrong, or acting on the wrong data, has real
 * consequences, and a segmented control sitting next to the nav is exactly the
 * kind of thing a mouse finds by accident.
 *
 * The switch itself only writes a cookie (`POST /admin/api/env`). It mints no
 * token and moves none: sessions are per-environment, so the response reports
 * whether one already exists for the target and the browser goes to the
 * dashboard or to that environment's login accordingly. A FULL page load is
 * used, not a client-side route change, because the environment is resolved
 * server-side in the layout and every screen must re-fetch against the new API.
 */
export function EnvSwitcher({
  env,
  availableEnvs,
  authenticatedEnvs,
}: {
  env: ApiEnv;
  availableEnvs: ApiEnv[];
  authenticatedEnvs: ApiEnv[];
}) {
  const [pending, setPending] = useState<ApiEnv | null>(null);
  const [confirming, setConfirming] = useState<ApiEnv | null>(null);
  const [error, setError] = useState<string | null>(null);

  // With a single environment there is nothing to switch between; the badge in
  // the nav already says where you are.
  if (availableEnvs.length < 2) return null;

  const switchTo = async (target: ApiEnv) => {
    setError(null);
    setConfirming(null);
    setPending(target);
    try {
      const res = await fetch('/admin/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: target }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        authenticated?: boolean;
        error?: string;
      };
      if (!res.ok || body.success === false) {
        setError(body.error || 'Could not switch environment');
        setPending(null);
        return;
      }
      // Full reload: the layout resolves the environment server-side and every
      // screen must re-query the newly selected API.
      window.location.href = body.authenticated ? '/admin/overview' : '/admin/login';
    } catch {
      setError('Network error. Try again.');
      setPending(null);
    }
  };

  const onSelect = (target: ApiEnv) => {
    if (target === env) return;
    if (isDangerousEnv(target)) {
      setConfirming(target);
      return;
    }
    void switchTo(target);
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        role="group"
        aria-label="Pool environment"
        className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5"
      >
        {availableEnvs.map((candidate) => {
          const active = candidate === env;
          const signedIn = authenticatedEnvs.includes(candidate);
          return (
            <button
              key={candidate}
              type="button"
              onClick={() => onSelect(candidate)}
              disabled={pending !== null}
              aria-current={active ? 'true' : undefined}
              title={`${ENV_LABELS[candidate]} — ${ENV_DESCRIPTIONS[candidate]}${
                signedIn ? '' : ' (not signed in)'
              }`}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors disabled:opacity-60',
                active
                  ? ENV_BADGE[candidate].switcherActiveClassName
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              {pending === candidate ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : signedIn ? (
                <Check className={cn('h-3 w-3', active ? 'opacity-90' : 'opacity-50')} />
              ) : null}
              {ENV_LABELS[candidate]}
            </button>
          );
        })}
      </div>

      {confirming && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-2 py-1.5 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Switch to <strong>{ENV_LABELS[confirming]}</strong>? {ENV_DESCRIPTIONS[confirming]}
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 px-2 text-xs"
            onClick={() => void switchTo(confirming)}
          >
            Switch
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setConfirming(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
