import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Where MapLibre's stylesheet is imported — a SOURCE SCAN, deliberately.
 *
 * ⚠️ THE BUG: the admin map painted at the TOP OF THE PAGE instead of in its
 * card. MapLibre positions its canvas absolutely and relies on
 * `.maplibregl-map { position: relative }` from its own stylesheet. That
 * stylesheet was imported inside `components/admin/stats/GeographyMap.tsx`,
 * which is pulled in through `next/dynamic({ ssr: false })` — so its CSS landed
 * in the DYNAMIC chunk and was not in effect when the canvas first painted. The
 * canvas anchored to the viewport instead, and escaped.
 *
 * ⚠️ WHY THIS IS A SOURCE SCAN AND NOT A BROWSER TEST. It is a TIMING bug: by
 * the time any Playwright assertion runs, the dynamic chunk has long since
 * loaded and the canvas sits exactly where it belongs. Measured, not assumed —
 * a geometry assertion in the offline e2e suite was written first, the fix was
 * reverted underneath it, and the suite stayed GREEN. A test that cannot fail
 * on the bug it was written for is worse than no test, because it advertises
 * coverage that is not there.
 *
 * What IS deterministic is where the import lives. `globals.css` is the page's
 * main stylesheet; the browser has it before anything renders. So that is what
 * is asserted.
 *
 * If you are moving this import, the question to answer is not "does the map
 * still look right in dev" — it will. It is "is this stylesheet in the document
 * on the FIRST paint, with a cold cache".
 */

const read = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), ...parts), 'utf8');

describe("MapLibre's stylesheet", () => {
  it('is imported by the main stylesheet, where it cannot arrive late', () => {
    const globals = read('app', 'globals.css');
    expect(globals).toMatch(/@import\s+['"]maplibre-gl\/dist\/maplibre-gl\.css['"]/);
  });

  it('comes before every rule, or the browser drops it', () => {
    // CSS requires `@import` to precede all rules — including the `@tailwind`
    // directives this file opens with. An import placed after them is silently
    // ignored, which looks exactly like not importing it at all.
    const globals = read('app', 'globals.css');
    const importAt = globals.indexOf('@import');
    const firstRuleAt = globals.indexOf('@tailwind');
    expect(importAt).toBeGreaterThanOrEqual(0);
    expect(importAt).toBeLessThan(firstRuleAt);
  });

  it('is NOT imported by the dynamically-loaded map component', () => {
    // ⚠️ The regression, stated directly: an import here puts the stylesheet
    // back in the dynamic chunk and the canvas escapes again on first paint.
    const component = read('components', 'admin', 'stats', 'GeographyMap.tsx');
    expect(component).not.toMatch(/^\s*import\s+['"]maplibre-gl\/dist\/maplibre-gl\.css['"]/m);
  });

  it('keeps a positioned ancestor on the map container as well', () => {
    // Belt to the stylesheet's braces: even with the CSS late, an explicitly
    // positioned wrapper stops the canvas reaching the viewport.
    const component = read('components', 'admin', 'stats', 'GeographyMap.tsx');
    expect(component).toMatch(/className="relative"/);
  });
});
