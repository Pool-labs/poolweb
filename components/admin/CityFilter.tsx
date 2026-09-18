'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { metricsApi } from '@/lib/admin/adminApi';
import { cn } from '@/lib/utils';
import type { AdminGeographyCity } from '@/lib/admin/types';

/**
 * Typeahead over the city keys the server itself published (#33 Part B).
 *
 * ⚠️ THE KEY IS OPAQUE AND TRAVELS UNCHANGED. `onChange` emits a `key` exactly
 * as `GET /admin/metrics/geography` returned it — never re-derived from the
 * display name, never normalized, never lower-cased. The server matches it by
 * equality and deliberately does NOT normalize either, because pre-#128 and
 * pre-#469 legacy keys are published too: tidying a key here would make exactly
 * those cities unfilterable, and silently — the request would simply return
 * nothing, which looks like an empty city rather than a broken filter.
 *
 * That is also why this is a pick-from-the-list control and not a free-text
 * box. You cannot type a key that the server did not hand out.
 */
export function CityFilter({
  value,
  onChange,
  className,
}: {
  /** The selected city key, or null. */
  value: string | null;
  onChange: (key: string | null) => void;
  className?: string;
}) {
  const [cities, setCities] = useState<AdminGeographyCity[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  /**
   * One read per mount. The city list is ALL TIME — `days` scopes only the
   * geography response's "new" columns — so any window offers every city, and
   * a filter control has no business re-reading as the user types.
   */
  useEffect(() => {
    let cancelled = false;
    metricsApi
      .geography()
      .then((geo) => {
        if (cancelled) return;
        setCities(geo.cities);
        setTruncated(geo.citiesTruncated);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on an outside click — a dropdown that survives one is a trap.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const selected = useMemo(
    () => cities?.find((c) => c.key === value) ?? null,
    [cities, value],
  );

  const matches = useMemo(() => {
    const all = cities ?? [];
    const needle = queryText.trim().toLowerCase();
    const pool = needle
      ? all.filter(
          (c) =>
            c.display.toLowerCase().includes(needle) ||
            (c.regionCode ?? '').toLowerCase().includes(needle) ||
            (c.countryCode ?? '').toLowerCase().includes(needle),
        )
      : all;
    return pool.slice(0, 20);
  }, [cities, queryText]);

  // A chosen city renders as a removable chip, so the filter in force is never
  // just placeholder text in a box the reader has scrolled past.
  if (value !== null) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border bg-muted px-3 py-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {/* The DISPLAY name once the list has loaded; until then the key,
              which is at least true, rather than a blank chip. */}
          <span className="truncate">{selected?.display ?? value}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setQueryText('');
            onChange(null);
          }}
        >
          <X className="mr-1 h-4 w-4" />
          Clear city
        </Button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Input
        aria-label="Filter by city"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={failed ? 'City list unavailable' : 'Filter by city...'}
        disabled={failed}
        value={queryText}
        onChange={(e) => {
          setQueryText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="pl-8"
      />
      {open && !failed && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {cities === null ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Loading cities…</p>
          ) : matches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No city matches that.
            </p>
          ) : (
            <ul role="listbox">
              {matches.map((city) => (
                <li key={city.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setOpen(false);
                      setQueryText('');
                      onChange(city.key);
                    }}
                  >
                    <span className="truncate">{city.display}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {city.userCount} users · {city.poolCount} pools
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {truncated && cities !== null && (
            // The API caps the list; say so rather than let a missing city read
            // as "nobody is there".
            <p className="border-t px-2 py-1.5 text-[11px] text-muted-foreground">
              Showing the most populous cities only — a very small city may not
              be listed.
            </p>
          )}
        </div>
      )}
      {failed && (
        <p className="mt-1 text-xs text-muted-foreground">
          The city list could not be loaded, so this filter is off — the rows
          below are unfiltered, not empty.
        </p>
      )}
    </div>
  );
}
