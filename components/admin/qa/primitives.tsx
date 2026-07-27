'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminApiError } from '@/lib/admin/adminApi';
import { formatDateTime, formatMoney, parseDollarsToCents } from '@/lib/admin/format';
import type { QaFanoutResult } from '@/lib/admin/types';

/**
 * Shared building blocks for the staging QA console.
 *
 * Two jobs:
 *  1. `useQaAction` — the house `runAction(fn)` closure pattern (see
 *     app/admin/users/[id]/page.tsx) generalized into a hook, so every one of
 *     the console's ~15 triggers gets identical busy/error/result semantics.
 *  2. Drift-proof rendering — the #132 contract is provisional, so results are
 *     rendered generically (`KeyValueRows` / `JsonBlock`) rather than against
 *     field lists that a server-side rename would break.
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
 * The result of a notification fan-out. Partial success is the COMMON case, so
 * this always shows the concrete numbers and every per-recipient reason rather
 * than collapsing to a binary success/fail.
 */
export function FanoutResultAlert({ result }: { result: QaFanoutResult }) {
  const failed = result.failed ?? [];
  const partial = failed.length > 0;

  return (
    <Alert
      className={
        partial
          ? 'border-amber-400/60 bg-amber-400/5'
          : 'border-emerald-500/40 bg-emerald-500/5'
      }
    >
      {partial ? (
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      )}
      <AlertTitle className="flex flex-wrap items-center gap-2">
        <span>
          Delivered {result.delivered} of {result.targeted}
        </span>
        <Badge variant={partial ? 'secondary' : 'default'}>
          {partial ? `${failed.length} failed` : 'All delivered'}
        </Badge>
      </AlertTitle>
      {partial && (
        <AlertDescription className="mt-2">
          <ul className="space-y-1">
            {failed.map((f) => (
              <li key={f.userId} className="flex flex-wrap gap-2 text-xs">
                <span className="font-mono text-muted-foreground">{f.userId}</span>
                <span>{f.reason}</span>
              </li>
            ))}
          </ul>
        </AlertDescription>
      )}
    </Alert>
  );
}

// ─── Drift-proof value rendering ──────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

/**
 * Render one arbitrary value from an API payload. Money is INTEGER CENTS on the
 * wire, so any key ending in `Cents` goes through `formatMoney` — never raw.
 */
export function formatUnknown(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return key.endsWith('Cents') ? formatMoney(value) : String(value);
  }
  if (typeof value === 'string') {
    if (ISO_DATE.test(value)) return formatDateTime(value);
    return value;
  }
  return <JsonBlock value={value} />;
}

/** Pretty-printed JSON, horizontally scrollable so it never widens the page. */
export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** Label/value rows for any record, with money + timestamp keys formatted. */
export function KeyValueRows({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No fields</p>;
  }
  return (
    <dl className="space-y-1.5 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-wrap items-start justify-between gap-3">
          <dt className="text-muted-foreground">{key}</dt>
          <dd className="max-w-[70%] break-words text-right font-mono text-xs">
            {formatUnknown(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Collapsible raw payload — the escape hatch when a shape is unrecognized. */
export function RawSection({ label, value }: { label: string; value: unknown }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="raw" className="border-b-0">
        <AccordionTrigger className="py-2 text-xs text-muted-foreground">{label}</AccordionTrigger>
        <AccordionContent>
          <JsonBlock value={value} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** True when `value` is a plain object safe to feed to `KeyValueRows`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
