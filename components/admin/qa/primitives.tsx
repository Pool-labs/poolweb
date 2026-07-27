'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminApiError } from '@/lib/admin/adminApi';
import { formatMoney, parseDollarsToCents } from '@/lib/admin/format';
import { QA_MONEY_FREE_COPY_MESSAGE, QA_MONEY_LIKE_PATTERNS } from '@/lib/admin/types';

/**
 * Shared building blocks for the staging QA console.
 *
 * Two jobs:
 *  1. `useQaAction` — the house `runAction(fn)` closure pattern (see
 *     app/admin/users/[id]/page.tsx) generalized into a hook, so every one of
 *     the console's triggers gets identical busy/error/result semantics, plus
 *     a `mapError` seam for the status codes the contract calls out (409 over
 *     the broadcast cap, 504 job-still-running).
 *  2. The shared result/input vocabulary — money in, ids out, and the two
 *     guards that stand between a click and an irreversible action
 *     (`ConfirmPhraseInput`, `checkPushCopy`).
 */

// ─── Action state ─────────────────────────────────────────────────────────────

export interface QaAction<T> {
  busy: boolean;
  error: string | null;
  result: T | null;
  /**
   * Run a mutation. `mapError` gets the thrown error (with its HTTP status when
   * it is an AdminApiError) and may return a friendlier message — used for the
   * status codes the contract calls out (409 caps/races, 504 job timeouts).
   */
  run: (
    fn: () => Promise<T>,
    mapError?: (err: Error, status: number | null) => string | null,
  ) => Promise<void>;
  reset: () => void;
}

export function useQaAction<T>(): QaAction<T> {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const run = useCallback<QaAction<T>['run']>(async (fn, mapError) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await fn());
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Action failed');
      const status = e instanceof AdminApiError ? e.status : null;
      setError(mapError?.(err, status) ?? err.message ?? 'Action failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { busy, error, result, run, reset };
}

/** Spinner shown inside a button while its action is in flight. */
export function BusySpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

export function FormField({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Dollar input that reports back INTEGER CENTS. The raw text is owned by the
 * caller; `parseDollarsToCents` (string-based, no float math) is the only
 * conversion, and the parsed value is echoed so the operator sees exactly what
 * will be sent.
 */
export function MoneyField({
  id,
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hint?: ReactNode;
}) {
  const cents = parseDollarsToCents(value);
  return (
    <FormField
      label={label}
      htmlFor={id}
      hint={
        <>
          {value.trim().length > 0 &&
            (cents === null ? (
              <span className="text-destructive">Enter a valid amount, e.g. 12.34</span>
            ) : (
              <span>
                Sends <code className="rounded bg-muted px-1 py-0.5 font-mono">{cents}</code> cents (
                {formatMoney(cents)})
              </span>
            ))}
          {hint && <span className="block">{hint}</span>}
        </>
      }
    >
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        inputMode="decimal"
        autoComplete="off"
      />
    </FormField>
  );
}

/** Amber-tinted wrapper marking the ACTING user of a workflow (vs. its target). */
export function ActingUserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-400/60 bg-amber-400/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        Acts as
      </div>
      {children}
    </div>
  );
}

// ─── Result rendering ─────────────────────────────────────────────────────────

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function SuccessAlert({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Alert className="border-emerald-500/40 bg-emerald-500/5">
      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      <AlertTitle className="text-emerald-700 dark:text-emerald-400">{title}</AlertTitle>
      {children && <AlertDescription className="mt-2 space-y-2">{children}</AlertDescription>}
    </Alert>
  );
}

/** Amber alert for "not an error, but don't walk away" outcomes (e.g. a 504). */
export function WarningAlert({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Alert className="border-amber-400/60 bg-amber-400/5">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-700 dark:text-amber-400">{title}</AlertTitle>
      {children && <AlertDescription className="mt-2 space-y-2">{children}</AlertDescription>}
    </Alert>
  );
}

/**
 * The result of a notification fan-out.
 *
 * The API reports how many recipients `notify()` was invoked for plus the ids
 * it acted on — there is deliberately NO per-recipient failure list, so absence
 * from `recipientIds` is the only failure signal. When fewer ids come back than
 * were selected, that gap is called out rather than left for the eye to spot.
 */
export function SentResultAlert({
  sentCount,
  recipientIds,
  selectedCount,
  title = 'Sent',
}: {
  sentCount: number;
  recipientIds: string[];
  /** How many the operator picked, when that is known (not for broadcast). */
  selectedCount?: number;
  title?: string;
}) {
  const ids = recipientIds ?? [];
  const short = selectedCount !== undefined && sentCount < selectedCount;

  return (
    <Alert
      className={
        short ? 'border-amber-400/60 bg-amber-400/5' : 'border-emerald-500/40 bg-emerald-500/5'
      }
    >
      {short ? (
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      )}
      <AlertTitle className="flex flex-wrap items-center gap-2">
        <span>
          {title}: {sentCount} recipient{sentCount === 1 ? '' : 's'}
        </span>
        {short && <Badge variant="secondary">{selectedCount! - sentCount} not reached</Badge>}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {short && (
          <p>
            {selectedCount} were selected but only {sentCount} were notified. The API returns no
            per-recipient reason — inspect a missing user to see why (no push token, opted out, or
            deleted).
          </p>
        )}
        {ids.length > 0 && <IdList label="Recipient ids" ids={ids} />}
      </AlertDescription>
    </Alert>
  );
}

/** A compact, scrollable list of ids returned by an action. */
export function IdList({ label, ids }: { label: string; ids: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide">
        {label} ({ids.length})
      </div>
      <ul className="max-h-40 space-y-0.5 overflow-auto rounded-md bg-muted p-2">
        {ids.map((id) => (
          <li key={id} className="font-mono text-xs">
            {id}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * MONEY-FREE PUSH COPY — client mirror of the API's `moneyFreeCopy` refinement.
 *
 * Push/broadcast copy is the one free text in Pool that lands on a lock screen,
 * so the server rejects currency symbols, decimal amounts and `@handles` with a
 * 400. Checking here too turns that into inline feedback while typing. The
 * SERVER check is the one that counts; this is a heuristic, never a proof.
 *
 * Returns an error string, or null when the copy looks acceptable.
 */
export function checkPushCopy(value: string, maxChars: number): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxChars) return `Too long — ${trimmed.length}/${maxChars} characters`;
  if (QA_MONEY_LIKE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return QA_MONEY_FREE_COPY_MESSAGE;
  }
  return null;
}

// ─── Typed confirmation ───────────────────────────────────────────────────────

/**
 * Guard for a destructive/irreversible action: the operator must type the exact
 * phrase before the caller's button un-disables. The phrase is also what gets
 * sent as the API's `confirmation` field, so this doubles as the input.
 */
export function ConfirmPhraseInput({
  phrase,
  value,
  onChange,
  disabled,
  id,
}: {
  phrase: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  id: string;
}) {
  const matches = value === phrase;
  return (
    <FormField
      label="Type the confirmation phrase"
      htmlFor={id}
      hint={
        <>
          Must match exactly:{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">{phrase}</code>
          {value.length > 0 && !matches && (
            <span className="ml-2 text-destructive">Does not match yet</span>
          )}
        </>
      }
    >
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={phrase}
        autoComplete="off"
        spellCheck={false}
        className={matches ? 'border-emerald-500/60' : undefined}
      />
    </FormField>
  );
}
