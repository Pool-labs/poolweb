/**
 * The canonical city key (poolmobile #128, regions added by #469):
 *
 *   `<folded name>|<region code or empty>|<alpha-2 country or empty>`
 *
 * Country + region + city all derive from that ONE column — the dashboard
 * never reads coordinates to answer "where is this" (#31's AC). The display
 * name is the sibling `locationCity` column ("Columbia, MO, US"); the key only
 * supplies the structured parts, so a pre-#469 two-segment key still parses
 * (region empty) and a legacy row that never recorded a country reads "—",
 * never a guess (#128's own rule against inferring one).
 */

export const CITY_KEY_SEPARATOR = '|';

export interface ParsedCityKey {
  /** The folded, lowercase city name segment — display via `locationCity` instead. */
  cityKey: string;
  /** Upper-cased region code (`MO`, `ON`) or null. */
  regionCode: string | null;
  /** Upper-cased ISO alpha-2 (`US`, `CA`) or null. */
  countryCode: string | null;
  /** English country name resolved from the code, or the code itself. */
  countryName: string | null;
}

export function parseCityKey(key: string | null | undefined): ParsedCityKey | null {
  if (!key) return null;
  const segments = key.split(CITY_KEY_SEPARATOR);
  const cityKey = segments[0] ?? '';
  if (!cityKey) return null;
  // Three segments since #469; two before it (name|country). Anything else is
  // not a key this dashboard knows how to read.
  const [regionRaw, countryRaw] =
    segments.length >= 3 ? [segments[1], segments[2]] : [null, segments[1] ?? null];
  const regionCode = regionRaw ? regionRaw.toUpperCase() : null;
  const countryCode = countryRaw ? countryRaw.toUpperCase() : null;
  return {
    cityKey,
    regionCode,
    countryCode,
    countryName: countryCode ? countryDisplayName(countryCode) : null,
  };
}

/**
 * "US" → "United States" via the platform's own `Intl.DisplayNames`; falls
 * back to the bare code where the runtime lacks the data, so the page never
 * shows less than the key holds.
 */
export function countryDisplayName(alpha2: string): string {
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return names.of(alpha2) ?? alpha2;
  } catch {
    return alpha2;
  }
}
