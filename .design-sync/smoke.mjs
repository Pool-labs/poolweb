// Best-effort DOM smoke test for the emitted preview cards.
//
// The user declined a headless-browser install, so the converter's real render
// check (package-validate.mjs) and the screenshot grading (package-capture.mjs)
// cannot run. This is the cheap substitute: load each <Name>.html in jsdom,
// let the real bundle mount the real component, and report anything that
// throws or comes up empty.
//
// It is NOT a visual grade — jsdom has no layout engine, so it cannot see
// unstyled text, collapsed spacing, wrong colours or identical variants. It
// only answers "did this mount without exploding".
//
//   node .design-sync/smoke.mjs [--only Name,Name]

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from '../.ds-sync/node_modules/jsdom/lib/api.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'ds-bundle');
const COMPONENTS = join(OUT, 'components');

const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(',')) : null;

const cards = [];
for (const group of readdirSync(COMPONENTS)) {
  for (const name of readdirSync(join(COMPONENTS, group))) {
    const html = join(COMPONENTS, group, name, `${name}.html`);
    if (existsSync(html) && (!only || only.has(name))) cards.push({ group, name, html });
  }
}

// jsdom lacks the browser APIs the DS's components and radix primitives reach
// for. Stub them so a missing API never masquerades as a broken component.
function beforeParse(window) {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 120, width: 320, height: 120, toJSON() {} };
  window.Element.prototype.getBoundingClientRect = () => rect;
  window.Range.prototype.getBoundingClientRect = () => rect;
  window.Range.prototype.getClientRects = () => [];
  class Obs {
    constructor(cb) { this.cb = cb; }
    observe(el) {
      // Report immediately-intersecting so IntersectionObserver-gated reveals
      // (`.reveal` → `.is-visible`) reach their visible state.
      try { this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el, contentRect: rect }], this); } catch {}
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  window.IntersectionObserver = Obs;
  window.ResizeObserver = Obs;
  window.matchMedia = window.matchMedia || ((q) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  }));
  // jsdom ships no fetch. Components that load data would otherwise report
  // "fetch is not defined", which reads as a broken component when the real
  // browser behaviour is simply "stays in its loading state". A never-settling
  // promise reproduces that.
  window.fetch = () => new Promise(() => {});
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLCanvasElement.prototype.getContext = () => null;
  if (!window.DOMRect) window.DOMRect = function () { return rect; };
}

const results = [];
for (const c of cards) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errs.push(String(e.message || e).split('\n')[0]));
  vc.on('error', (...a) => errs.push(a.map(String).join(' ').split('\n')[0]));
  let dom;
  try {
    // Inline every <script src> rather than letting jsdom fetch them: with
    // `resources: 'usable'` the external loads race the inline mount script,
    // so the same card reports "mounted" on one run and "empty" on the next.
    // Inlining makes execution strictly document-order and deterministic.
    const html = readFileSync(c.html, 'utf8').replace(
      /<script src="([^"]+)"><\/script>/g,
      (m, src) => {
        const p = join(dirname(c.html), src);
        return existsSync(p) ? `<script>${readFileSync(p, 'utf8')}</script>` : m;
      },
    );
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: pathToFileURL(c.html).href,
      virtualConsole: vc,
      beforeParse,
    });
    await new Promise((r) => setTimeout(r, 700));
    const doc = dom.window.document;
    // Unauthored cards mount into #root; authored ones into the #g cell grid,
    // which is replaced by .ds-single when a single story is picked.
    const root = doc.getElementById('root') || doc.querySelector('.ds-single') || doc.getElementById('g');
    const text = (root?.textContent || '').replace(/\s+/g, ' ').trim();
    const fellBack = !!root?.querySelector('[data-ds-fallback]');
    // The card's own mount() writes "⚠ <message>" into any cell that threw —
    // the most direct per-story error signal available without a browser.
    const cellErrs = [...(root?.querySelectorAll('.ds-cell, .ds-single') ?? [])]
      .map((el) => (el.textContent || '').trim())
      .filter((t) => t.includes('⚠'))
      .map((t) => t.replace(/\s+/g, ' ').slice(0, 120));
    const cells = root?.querySelectorAll('.ds-cell').length ?? 0;
    if (process.argv.includes('--dump')) {
      console.log(`\n───── ${c.name} (root=${root?.id || root?.className || 'none'}) ─────`);
      console.log((root?.innerHTML || '(empty)').slice(0, 2500));
    }
    results.push({
      ...c,
      mounted: !!root?.childElementCount,
      elements: root ? root.querySelectorAll('*').length : 0,
      cells,
      floorCard: fellBack,
      textLen: text.length,
      text: text.slice(0, 160),
      cellErrs,
      errs: [...new Set([...cellErrs, ...errs])].slice(0, 3),
    });
  } catch (e) {
    results.push({ ...c, mounted: false, elements: 0, floorCard: false, textLen: 0, text: '', errs: [String(e.message).split('\n')[0]] });
  } finally {
    dom?.window?.close?.();
  }
}

// Scoped runs (parallel authoring agents) must not clobber the shared report.
if (!only) writeFileSync(join(OUT, '.smoke.json'), JSON.stringify(results, null, 2) + '\n');
else for (const r of results) console.log(`  ${r.name}: ${r.floorCard ? 'FLOOR CARD' : r.mounted ? `mounted ${r.elements} els, ${r.textLen} chars` : 'EMPTY'}${r.errs[0] ? '  ← ' + r.errs[0] : ''}\n    text: ${r.text}`);

const floor = results.filter((r) => r.floorCard);
const broke = results.filter((r) => !r.floorCard && (!r.mounted || r.elements < 2));
const threw = results.filter((r) => !r.floorCard && r.errs.length);
console.log(`smoke: ${results.length} cards — ${results.length - floor.length - broke.length} mounted, ${floor.length} floor card, ${broke.length} empty/thin`);
if (broke.length) console.log(`\nEMPTY/THIN (${broke.length}):\n` + broke.map((r) => `  ${r.group}/${r.name}${r.errs[0] ? '  ← ' + r.errs[0] : ''}`).join('\n'));
if (threw.length) console.log(`\nMOUNTED BUT THREW (${threw.length}):\n` + threw.map((r) => `  ${r.group}/${r.name}  ← ${r.errs[0]}`).join('\n'));
