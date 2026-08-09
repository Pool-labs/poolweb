// Compiles the repo's Tailwind source into the single static stylesheet the
// converter ships as cfg.cssEntry. MUST run before package-build.mjs — and
// again after authoring previews, so utilities used only in preview sources
// are present in the output.
//
//   node .design-sync/build-css.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(HERE, 'compiled.css');

execFileSync(
  join(ROOT, 'node_modules/.bin/tailwindcss'),
  ['-c', '.design-sync/tailwind.dssync.ts', '-i', '.design-sync/css-entry.css', '-o', OUT, '--minify=false'],
  { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] },
);
console.error(`  css: ${(statSync(OUT).size / 1024).toFixed(0)} KB → .design-sync/compiled.css`);
