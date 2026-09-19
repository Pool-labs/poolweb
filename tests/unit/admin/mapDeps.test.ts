import { describe, expect, it } from 'vitest';

import maplibrePkg from 'maplibre-gl/package.json';
import pmtilesPkg from 'pmtiles/package.json';

/**
 * The renderer pairing the Geography map depends on.
 *
 * ⚠️ THIS TEST EXISTS BECAUSE THE FAILURE IT GUARDS IS COMPLETELY SILENT.
 * The map shipped on `maplibre-gl` v6 and rendered a BLANK canvas in
 * production. Not an error, not an empty state, not a console warning — a
 * correctly-sized canvas, the attribution control, the data panel beneath it,
 * and nothing drawn. Every test was green, because the offline e2e project
 * deliberately refuses the tiles and therefore exercises the FAILURE path;
 * nothing exercised "the map loaded and drew nothing".
 *
 * ── What actually happens, measured rather than reasoned ────────────────────
 *
 * With the real CDN, counting requests to it:
 *
 *   maplibre-gl 6.10.0 →  1 request   (the pmtiles header, and nothing else:
 *                                      zero tile ranges, zero glyph PBFs,
 *                                      zero `error` events)
 *   maplibre-gl 5.24.0 →  9 requests  (pmtiles RANGE reads carrying real tile
 *                                      data, plus the Noto Sans glyph PBFs)
 *
 * v6 appears to have moved tile loading such that a protocol registered with
 * `addProtocol` on the MAIN thread no longer serves tiles — note v6 exports
 * `importScriptInWorkers`, which is how a custom protocol would be made
 * available to the workers. The source TileJSON is still fetched on the main
 * thread, which is why exactly one request happens and nothing errors: from
 * MapLibre's point of view the source simply yielded no tiles.
 *
 * `pmtiles` 4.5.0 declares NO peer dependency on `maplibre-gl`, so npm/pnpm
 * will happily resolve a combination that does not work. Nothing but this test
 * stands between a routine `pnpm up` and a blank map nobody notices.
 *
 * ── If you are here because this test failed ────────────────────────────────
 *
 * Do not just widen the range. Re-run the measurement: point a browser at
 * `/admin/stats` → Geography with the tiles NOT stubbed, and count requests to
 * the tiles CDN. More than one, including `fonts/…pbf`, means the pairing
 * works. One means the map is blank and the upgrade must not ship.
 *
 * Supporting v6 properly is a real option, not a dead end — it needs the
 * pmtiles protocol registered in the workers rather than only on the main
 * thread. That is worth doing when v5 stops getting fixes; it was not worth
 * doing at 1am on launch day.
 */

const majorOf = (version: string): number => Number(version.split('.')[0]);

describe('the Geography map renderer pairing', () => {
  it('pins maplibre-gl to v5 — v6 draws a blank canvas with pmtiles', () => {
    expect(majorOf(maplibrePkg.version)).toBe(5);
  });

  it('keeps pmtiles on v4, whose protocol signature v5 accepts', () => {
    expect(majorOf(pmtilesPkg.version)).toBe(4);
  });
});
