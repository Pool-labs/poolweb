import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * The grouped-section kit the user and pool detail pages share (poolweb #31).
 *
 * A detail page is a set of labelled cards, each a short list of label/value
 * rows. Two rules live here so neither page can drift from the other:
 *
 *  - An ABSENT value renders as an em dash — never an empty cell, never "null".
 *  - A section whose data the current API version does not report says so in
 *    one line (`Unreported`) rather than rendering a column of dashes that
 *    reads as "this person has no profile". Production serves a pre-#618 image
 *    until its first dispatch, so this is the state every production page is
 *    in today.
 */

export const ABSENT = '—';

export function DetailCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  /** Plain text value; `children` wins when both are given. */
  value?: string | number | null;
  mono?: boolean;
  children?: ReactNode;
}) {
  const rendered =
    children ?? (value === null || value === undefined || value === '' ? ABSENT : String(value));
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={mono ? 'break-all text-right font-mono text-xs' : 'text-right'}>
        {rendered}
      </span>
    </div>
  );
}

/** A multi-line, user-authored text (bio, rules) — pre-wrapped, never clipped. */
export function TextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap break-words rounded-md border bg-muted/40 px-3 py-2 text-sm">
        {value ? value : <span className="text-muted-foreground">{ABSENT}</span>}
      </div>
    </div>
  );
}

/** Small inline chips for enum/tag arrays. */
export function ChipList({
  label,
  items,
  labelFn = (s) => s,
}: {
  label: string;
  items: string[] | undefined;
  labelFn?: (s: string) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground">{label}</div>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
            >
              {labelFn(item)}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground">{ABSENT}</div>
      )}
    </div>
  );
}

/** The one-line note a section shows when this API version reports none of it. */
export function Unreported({ what = 'These fields' }: { what?: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {what} are not reported by this API version (poolmobile #618) — nothing here is missing
      from the account, it is simply not in the payload yet.
    </p>
  );
}

/** Yes / No for a boolean, em dash when the API did not say. */
export function yesNo(value: boolean | undefined | null): string {
  if (value === undefined || value === null) return ABSENT;
  return value ? 'Yes' : 'No';
}
