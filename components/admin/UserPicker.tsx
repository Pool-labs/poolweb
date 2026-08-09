'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersApi } from '@/lib/admin/adminApi';
import { QA_DEFAULT_LIMITS, type AdminUserSummary } from '@/lib/admin/types';

/**
 * The admin surface's user picker — ONE component, reused everywhere a founder
 * has to name a person.
 *
 * Search-as-you-type over the existing #83 `GET /admin/users` list endpoint,
 * multi-select with removable chips, and a hard client-side cap (default 25,
 * matching the QA console's per-call recipient limit) with an explicit message
 * rather than a silently-ignored click.
 *
 * `max={1}` turns it into a single-select (picking replaces the selection) —
 * the mode used for "acting user" fields and for #14's per-user log pull.
 *
 * ⚠️ It lived under `components/admin/qa/` until #14 and moved up a level when
 * the per-user logs screen needed it: a picker shared by every admin screen must
 * not sit inside the STAGING-ONLY console's folder, or the next reader will
 * reasonably assume it is QA-gated. Its `max` default still points at the QA
 * limit purely as a fallback — every caller passes a live value.
 */

export interface PickedUser {
  id: string;
  name: string;
  email: string | null;
}

/** Best available human label for a user row. */
export function userLabel(u: AdminUserSummary): string {
  return (
    u.displayName ||
    [u.firstName, u.lastName].filter(Boolean).join(' ') ||
    u.username ||
    u.email ||
    u.id
  );
}

export function toPickedUser(u: AdminUserSummary): PickedUser {
  return { id: u.id, name: userLabel(u), email: u.email };
}

const RESULT_LIMIT = 8;
const DEBOUNCE_MS = 300;
/** Loose id shape (uuid or cuid) — enables the "use this id" escape hatch. */
const RAW_ID = /^[a-z0-9][a-z0-9-]{9,}$/i;

interface UserPickerProps {
  label: string;
  hint?: ReactNode;
  selected: PickedUser[];
  onChange: (next: PickedUser[]) => void;
  /**
   * Selection cap. 1 = single-select. Callers pass the LIVE value from
   * `QaStatus.limits.maxSelectedUsers`; this default is only a fallback.
   */
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  /** Show the "add every result" shortcut (fan-out tabs only). */
  allowAddAll?: boolean;
}

export function UserPicker({
  label,
  hint,
  selected,
  onChange,
  max = QA_DEFAULT_LIMITS.maxSelectedUsers,
  disabled,
  placeholder = 'Search by email, username, or name...',
  allowAddAll = false,
}: UserPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const single = max === 1;
  const atCap = selected.length >= max;

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.list({ q: q || undefined, limit: RESULT_LIMIT, offset: 0 });
      setResults(res.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search; the empty query pre-loads the first few users so the
  // picker is usable on staging without typing anything.
  useEffect(() => {
    const t = setTimeout(() => void search(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, search]);

  const add = (user: PickedUser) => {
    if (single) {
      onChange([user]);
      return;
    }
    if (selected.some((s) => s.id === user.id) || selected.length >= max) return;
    onChange([...selected, user]);
  };

  const addAll = () => {
    const room = max - selected.length;
    const additions = results
      .filter((u) => !selected.some((s) => s.id === u.id))
      .slice(0, Math.max(0, room))
      .map(toPickedUser);
    if (additions.length > 0) onChange([...selected, ...additions]);
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.id !== id));

  const trimmed = query.trim();
  const rawIdCandidate =
    RAW_ID.test(trimmed) && !results.some((u) => u.id === trimmed) && !selected.some((s) => s.id === trimmed)
      ? trimmed
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        {!single && (
          <span className={atCap ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
            {selected.length} / {max} selected
          </span>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span
              key={u.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs"
            >
              <span className="truncate font-medium">{u.name}</span>
              {u.email && <span className="truncate text-muted-foreground">{u.email}</span>}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(u.id)}
                aria-label={`Remove ${u.name}`}
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {!single && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>

      {atCap && !single && (
        <p className="text-xs text-destructive">
          Recipient limit reached ({max}). Remove someone before adding another — the API rejects
          more than {max} per call.
        </p>
      )}

      <div className="rounded-md border">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-xs text-destructive">{error}</div>
        ) : results.length === 0 && !rawIdCandidate ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No users found</div>
        ) : (
          <ul className="divide-y">
            {results.map((u) => {
              const chosen = selected.some((s) => s.id === u.id);
              return (
                <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{userLabel(u)}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email ?? u.id}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={chosen ? 'secondary' : 'outline'}
                    disabled={disabled || chosen || (atCap && !single)}
                    onClick={() => add(toPickedUser(u))}
                  >
                    {chosen ? 'Selected' : single ? 'Choose' : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </li>
              );
            })}
            {rawIdCandidate && (
              <li className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">Use this id directly</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {rawIdCandidate}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || (atCap && !single)}
                  onClick={() => add({ id: rawIdCandidate, name: rawIdCandidate, email: null })}
                >
                  Use id
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>

      {allowAddAll && !single && results.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || atCap}
          onClick={addAll}
          className="text-xs"
        >
          Add all results ({results.length})
        </Button>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
