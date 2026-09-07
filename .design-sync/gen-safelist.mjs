// Emits .design-sync/.tw-safelist.html — a literal list of class names fed to
// Tailwind's content scanner.
//
// Why: the shipped stylesheet is a Tailwind build, and Tailwind only emits
// classes it can SEE. Scanning only this repo's own markup produces a stylesheet
// that styles this repo's components perfectly and nothing else — so the moment
// the design agent writes its own layout glue (`p-7`, `bg-pool-gold`,
// `w-1/3`…) that markup renders unstyled. Enumerating the vocabulary here is
// what makes the utilities documented in conventions.md actually resolve.
//
// A `safelist: [{pattern: /./, variants: [...]}]` does the same thing in theory
// but is a combinatorial explosion that OOMs the build — hence an explicit list.
//
//   node .design-sync/gen-safelist.mjs

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const COLORS = [
  // Brand — the sticker-pop palette.
  'pool-blue', 'pool-yellow', 'pool-pink', 'pool-green', 'pool-gold',
  'navy', 'cloud', 'sky-tint', 'pool-sky', 'tint-yellow', 'tint-pink', 'tint-green',
  // Legacy names kept for the admin/app routes.
  'pool-orange', 'pool-purple', 'pool-navy', 'money-green', 'coin-gold',
  'splash-blue', 'droplet-cyan',
  // shadcn semantic tokens (mapped onto the brand in globals.css).
  'background', 'foreground', 'border', 'input', 'ring',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'destructive', 'destructive-foreground', 'card', 'card-foreground',
  'popover', 'popover-foreground',
  'white', 'black', 'transparent', 'current', 'inherit',
];
const OPACITY = ['', '/5', '/10', '/20', '/30', '/40', '/50', '/60', '/70', '/80', '/90', '/95'];
const SPACE = [
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '56', '64',
  '72', '80', '96', 'px', 'auto',
];
const FRACTIONS = ['1/2', '1/3', '2/3', '1/4', '2/4', '3/4', '1/5', '2/5', '3/5', '4/5', '1/6', '5/6', '1/12', '11/12'];
const SIZE_KEYWORDS = ['full', 'screen', 'auto', 'fit', 'min', 'max', 'svh', 'dvh', 'px'];
const TEXT = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
const RADIUS = ['none', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
const SHADOW = ['sm', '', 'md', 'lg', 'xl', '2xl', 'inner', 'none'];
const NUM_0_100 = ['0', '5', '10', '20', '25', '30', '40', '50', '60', '70', '75', '80', '90', '95', '100'];
const BREAKPOINTS = ['sm', 'md', 'lg', 'xl'];

const out = new Set();
const add = (c) => c && out.add(c);

// ── Colour utilities, with the states the sticker system uses ───────────────
for (const c of COLORS) {
  for (const o of OPACITY) {
    for (const p of ['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'from', 'via', 'to', 'decoration', 'outline', 'divide', 'placeholder', 'caret', 'accent', 'shadow']) {
      add(`${p}-${c}${o}`);
    }
  }
  for (const p of ['bg', 'text', 'border', 'ring']) {
    for (const v of ['hover', 'focus', 'focus-visible', 'active', 'disabled', 'group-hover', 'dark']) {
      add(`${v}:${p}-${c}`);
    }
  }
}

// ── Spacing ────────────────────────────────────────────────────────────────
const SPACE_PREFIXES = [
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
  '-m', '-mx', '-my', '-mt', '-mr', '-mb', '-ml',
  'gap', 'gap-x', 'gap-y', 'space-x', 'space-y',
  'top', 'right', 'bottom', 'left', 'inset', 'inset-x', 'inset-y',
];
for (const s of SPACE) {
  for (const p of SPACE_PREFIXES) add(`${p}-${s}`);
  for (const b of BREAKPOINTS) for (const p of ['p', 'px', 'py', 'pt', 'pb', 'm', 'mx', 'my', 'mt', 'mb', 'gap']) add(`${b}:${p}-${s}`);
}

// ── Sizing ─────────────────────────────────────────────────────────────────
for (const v of [...SPACE, ...FRACTIONS, ...SIZE_KEYWORDS]) {
  for (const p of ['w', 'h', 'min-w', 'min-h', 'max-w', 'max-h', 'size', 'basis']) add(`${p}-${v}`);
  for (const b of BREAKPOINTS) for (const p of ['w', 'h', 'max-w']) add(`${b}:${p}-${v}`);
}
for (const v of ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'none', 'prose', 'full', 'screen-sm', 'screen-md', 'screen-lg', 'screen-xl']) {
  add(`max-w-${v}`);
  for (const b of BREAKPOINTS) add(`${b}:max-w-${v}`);
}

// ── Typography ─────────────────────────────────────────────────────────────
for (const t of TEXT) { add(`text-${t}`); for (const b of BREAKPOINTS) add(`${b}:text-${t}`); }
for (const w of ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black']) add(`font-${w}`);
for (const f of ['sans', 'display', 'mono', 'serif']) add(`font-${f}`);
for (const l of ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', '3', '4', '5', '6', '7', '8', '9', '10']) add(`leading-${l}`);
for (const t of ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest']) add(`tracking-${t}`);
for (const a of ['left', 'center', 'right', 'justify', 'start', 'end']) { add(`text-${a}`); for (const b of BREAKPOINTS) add(`${b}:text-${a}`); }
for (const x of [
  'uppercase', 'lowercase', 'capitalize', 'normal-case', 'italic', 'not-italic',
  'underline', 'line-through', 'no-underline', 'truncate', 'text-ellipsis', 'text-clip',
  'break-words', 'break-all', 'break-normal', 'text-balance', 'text-pretty', 'tabular-nums',
  'antialiased', 'align-middle', 'align-top', 'align-bottom', 'align-baseline',
]) add(x);
for (const w of ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']) add(`whitespace-${w}`);
for (const n of ['1', '2', '3', '4', '5', '6', 'none']) add(`line-clamp-${n}`);

// ── Layout ─────────────────────────────────────────────────────────────────
for (const d of ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'hidden', 'table', 'table-cell', 'table-row', 'list-item', 'flow-root']) {
  add(d);
  for (const b of BREAKPOINTS) add(`${b}:${d}`);
}
for (const d of ['row', 'row-reverse', 'col', 'col-reverse']) { add(`flex-${d}`); for (const b of BREAKPOINTS) add(`${b}:flex-${d}`); }
for (const x of ['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse', 'flex-1', 'flex-auto', 'flex-initial', 'flex-none', 'shrink', 'shrink-0', 'grow', 'grow-0']) add(x);
for (const a of ['start', 'end', 'center', 'baseline', 'stretch']) { add(`items-${a}`); add(`self-${a}`); add(`content-${a}`); }
for (const j of ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch', 'normal']) { add(`justify-${j}`); add(`justify-items-${j}`); add(`justify-self-${j}`); }
for (let i = 1; i <= 12; i++) {
  add(`grid-cols-${i}`); add(`col-span-${i}`); add(`grid-rows-${i}`); add(`row-span-${i}`);
  add(`col-start-${i}`); add(`col-end-${i}`); add(`order-${i}`);
  for (const b of BREAKPOINTS) { add(`${b}:grid-cols-${i}`); add(`${b}:col-span-${i}`); add(`${b}:order-${i}`); }
}
add('grid-cols-none'); add('col-span-full'); add('row-span-full'); add('order-first'); add('order-last'); add('order-none');
for (const p of ['static', 'relative', 'absolute', 'fixed', 'sticky']) add(p);
for (const z of ['0', '10', '20', '30', '40', '50', 'auto']) add(`z-${z}`);
for (const o of ['auto', 'hidden', 'clip', 'visible', 'scroll', 'x-auto', 'y-auto', 'x-hidden', 'y-hidden', 'x-scroll', 'y-scroll']) add(`overflow-${o}`);
for (const x of ['visible', 'invisible', 'collapse', 'isolate', 'sr-only', 'not-sr-only']) add(x);

// ── Borders, radius, effects ───────────────────────────────────────────────
for (const r of RADIUS) {
  const s = r ? `-${r}` : '';
  for (const side of ['', '-t', '-r', '-b', '-l', '-tl', '-tr', '-bl', '-br']) add(`rounded${side}${s}`);
}
for (const w of ['0', '', '2', '4', '8']) {
  const s = w ? `-${w}` : '';
  for (const side of ['', '-t', '-r', '-b', '-l', '-x', '-y']) add(`border${side}${s}`);
  add(`ring${s}`); add(`divide-x${s}`); add(`divide-y${s}`);
}
for (const st of ['solid', 'dashed', 'dotted', 'double', 'none']) add(`border-${st}`);
for (const s of SHADOW) add(s ? `shadow-${s}` : 'shadow');
for (const n of NUM_0_100) { add(`opacity-${n}`); add(`hover:opacity-${n}`); }
for (const b of ['none', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl']) { add(b ? `blur-${b}` : 'blur'); add(b ? `backdrop-blur-${b}` : 'backdrop-blur'); }

// ── Motion / transform (transform + opacity only, per the brand rules) ─────
for (const x of ['transition', 'transition-all', 'transition-colors', 'transition-opacity', 'transition-transform', 'transition-none', 'transform', 'transform-gpu', 'will-change-transform']) add(x);
for (const d of ['75', '100', '150', '200', '300', '500', '700', '1000']) { add(`duration-${d}`); add(`delay-${d}`); }
for (const e of ['linear', 'in', 'out', 'in-out']) add(`ease-${e}`);
for (const a of ['none', 'spin', 'ping', 'pulse', 'bounce', 'bounce-slow', 'wiggle', 'float', 'money-rain', 'droplet-fall', 'splash', 'accordion-down', 'accordion-up']) add(`animate-${a}`);
for (const s of ['0', '50', '75', '90', '95', '100', '105', '110', '125', '150']) { add(`scale-${s}`); add(`hover:scale-${s}`); add(`active:scale-${s}`); }
for (const r of ['0', '1', '2', '3', '6', '12', '45', '90', '180']) { add(`rotate-${r}`); add(`-rotate-${r}`); add(`hover:rotate-${r}`); }
for (const t of SPACE) { add(`translate-x-${t}`); add(`translate-y-${t}`); add(`-translate-x-${t}`); add(`-translate-y-${t}`); }

// ── Misc ───────────────────────────────────────────────────────────────────
for (const c of ['pointer', 'default', 'not-allowed', 'wait', 'text', 'move', 'grab', 'grabbing', 'help']) add(`cursor-${c}`);
for (const o of ['contain', 'cover', 'fill', 'none', 'scale-down']) add(`object-${o}`);
for (const p of ['center', 'top', 'bottom', 'left', 'right']) add(`object-${p}`);
for (const a of ['auto', 'square', 'video']) add(`aspect-${a}`);
for (const x of ['select-none', 'select-text', 'select-all', 'pointer-events-none', 'pointer-events-auto', 'appearance-none', 'resize', 'resize-none', 'resize-y', 'outline-none', 'ring-offset-2', 'ring-offset-0', 'ring-offset-4', 'list-none', 'list-disc', 'list-decimal', 'backdrop-brightness-95', 'mix-blend-multiply', 'isolate']) add(x);
for (const x of ['sticker', 'sticker-interactive', 'btn-sticker', 'btn-yellow', 'btn-blue', 'btn-pink', 'btn-ghost', 'chip-sticker', 'text-sticker', 'svg-sticker-text', 'ticker-track', 'ticker-paused', 'cloud-drift', 'cloud-drift-slow', 'air-bob', 'anim-paused', 'reveal', 'is-visible', 'feed-item', 'feed-pop', 'is-shown', 'droplet-burst']) add(x);

const classes = [...out].sort();
writeFileSync(
  join(HERE, '.tw-safelist.html'),
  `<!-- GENERATED by .design-sync/gen-safelist.mjs — Tailwind content source only. -->\n<div class="${classes.join(' ')}"></div>\n`,
);
console.error(`  safelist: ${classes.length} classes → .design-sync/.tw-safelist.html`);
