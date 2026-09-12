/**
 * Display formatters for the admin surface. Money is always INTEGER CENTS on
 * the wire; never do float math on it — only format for display.
 */

/** Format integer cents as a USD string, e.g. 12345 → "$123.45". */
export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? '-' : ''}$${dollars}`;
}

/**
 * Parse a dollar string ("12.34", "$1,200", "7") into INTEGER CENTS, or null
 * when it isn't a valid non-negative amount.
 *
 * Deliberately string-based: `parseFloat(x) * 100` is float math and can land
 * on 1233.9999999999998 for real inputs. Whole dollars and the fractional part
 * are combined as integers instead, so the result is exact by construction.
 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Short date, e.g. "Jul 26, 2026". Returns "—" for null/invalid input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Date + time, e.g. "Jul 26, 2026, 14:03". Returns "—" for null/invalid input. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Remaining time as "m:ss", clamped at 0:00 — the impersonation countdown
 * (#84). Minutes-and-seconds only: the longest thing this ever counts is a
 * 15-minute session TTL.
 */
export function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Turn an enum-ish wire value ("FOO_BAR") into a display label ("Foo bar"). */
export function humanizeEnum(value: string): string {
  const lower = value.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
