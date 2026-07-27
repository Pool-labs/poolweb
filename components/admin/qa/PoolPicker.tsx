'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { poolsApi } from '@/lib/admin/adminApi';
import { formatMoney, humanizeEnum } from '@/lib/admin/format';
import type { AdminPoolSummary } from '@/lib/admin/types';

/**
 * Single-select pool picker for the QA console, mirroring `UserPicker` over the
 * existing #83 `GET /admin/pools`. Pool ids are opaque cuids — pasting one by
 * hand is where QA workflows go wrong, so the console always picks by name and
 * shows the id + live balance of what was picked.
 */

export interface PickedPool {
  id: string;
  name: string;
  balanceCents: number;
  status: string;
}

const RESULT_LIMIT = 8;
const DEBOUNCE_MS = 300;
const RAW_ID = /^[a-z0-9][a-z0-9-]{9,}$/i;

function toPickedPool(p: AdminPoolSummary): PickedPool {
  return { id: p.id, name: p.name, balanceCents: p.balanceCents, status: p.status };
}

export function PoolPicker({
  label = 'Pool',
  hint,
  selected,
  onChange,
  disabled,
}: {
  label?: string;
  hint?: ReactNode;
  selected: PickedPool | null;
  onChange: (next: PickedPool | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminPoolSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await poolsApi.list({ q: q || undefined, limit: RESULT_LIMIT, offset: 0 });
      setResults(res.pools);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void search(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, search]);

  const trimmed = query.trim();
  const rawIdCandidate =
    RAW_ID.test(trimmed) && !results.some((p) => p.id === trimmed) ? trimmed : null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{selected.name}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">{selected.id}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {formatMoney(selected.balanceCents)} · {humanizeEnum(selected.status)}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              aria-label="Clear pool"
              className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              disabled={disabled}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pools by name..."
              className="pl-8"
            />
          </div>

          <div className="rounded-md border">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="py-6 text-center text-xs text-destructive">{error}</div>
            ) : results.length === 0 && !rawIdCandidate ? (
              <div className="py-6 text-center text-xs text-muted-foreground">No pools found</div>
            ) : (
              <ul className="divide-y">
                {results.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatMoney(p.balanceCents)} · {p.memberCount} members ·{' '}
                        {humanizeEnum(p.status)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => onChange(toPickedPool(p))}
                    >
                      Choose
                    </Button>
                  </li>
                ))}
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
                      disabled={disabled}
                      onClick={() =>
                        onChange({
                          id: rawIdCandidate,
                          name: rawIdCandidate,
                          balanceCents: 0,
                          status: 'UNKNOWN',
                        })
                      }
                    >
                      Use id
                    </Button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
