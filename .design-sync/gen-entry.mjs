// Generates the design-sync barrel entry + per-component doc stubs.
//
// Why this exists: poolWebApp is a Next.js app, not a published package — there
// is no dist/ and no .d.ts tree, and most components are DEFAULT exports, which
// the converter's synth-entry (`export * from …`) cannot re-export. So we author
// an explicit barrel and pass it via --entry.
//
// Run before package-build.mjs whenever components are added/removed:
//   node .design-sync/gen-entry.mjs
//
// Emits:
//   .design-sync/ds-entry.tsx        — the barrel (every export, subparts included)
//   .design-sync/docs/<Name>.md      — category stub so the DS pane groups sanely
//   .design-sync/.generated.json     — {components, subparts, excluded} for the config check

import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, Node, ts } from '../.ds-sync/node_modules/ts-morph/dist/ts-morph.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

// ── Curation ────────────────────────────────────────────────────────────────
// Compound sub-parts: stay exported from the bundle (the design agent composes
// with them) but get no preview card of their own — the parent's card shows the
// real composition. Decision recorded in NOTES.md.
const SUBPARTS = new Set([
  'AccordionContent', 'AccordionItem', 'AccordionTrigger',
  'AlertDescription', 'AlertTitle',
  'AvatarFallback', 'AvatarImage',
  'CardContent', 'CardDescription', 'CardFooter', 'CardHeader', 'CardTitle',
  'InputOTPGroup', 'InputOTPSeparator', 'InputOTPSlot',
  'SelectContent', 'SelectGroup', 'SelectItem', 'SelectLabel', 'SelectSeparator',
  'SelectScrollDownButton', 'SelectScrollUpButton', 'SelectTrigger', 'SelectValue',
  'TableBody', 'TableCaption', 'TableCell', 'TableFooter', 'TableHead',
  'TableHeader', 'TableRow',
  'TabsContent', 'TabsList', 'TabsTrigger',
]);

// Non-visual: providers, effect-only mounts, scroll wrappers, <defs> carriers.
// Exported from the bundle, never a card.
const NON_VISUAL = new Set([
  'ThemeProvider', 'MobileInit', 'MobileLayout', 'Reveal', 'BrandDefs', 'ScrollToTop',
  'HomeEffects',
]);

// group → the DS pane section. Anything unlisted falls back to its directory.
const GROUPS = {
  Sticker: ['StickerButton', 'StickerCard', 'Chip', 'BurstButton'],
  Brand: ['PoolMark', 'Coin', 'Bill', 'Droplet', 'Splash', 'CloudMark', 'Wordmark', 'BrandPattern'],
  Actions: ['Button'],
  Forms: ['Input', 'Textarea', 'Label', 'Select', 'InputOTP', 'Progress'],
  Layout: ['Card'],
  Navigation: ['Tabs', 'Accordion'],
  Feedback: ['Alert'],
  'Data Display': ['Table', 'Badge', 'Avatar', 'SeriesLineChart', 'SeriesBarChart'],
  Sections: [
    'Header', 'Footer', 'HeroPool', 'HowItWorks', 'PoolCards', 'FeedDemo', 'Ticker',
    'ScallopDivider', 'BetaCta', 'InviteFriends', 'InviteFriendsModal',
  ],
  Home: ['Hero', 'CardStage', 'Falls', 'HowSteps', 'Jump', 'SocialStory', 'HomeTicker', 'Wtf'],
  Admin: ['AdminNav', 'EnvBanner', 'EnvSwitcher', 'CriticalAlertBanner', 'UserPicker'],
  'Admin Moderation': ['ContentSnapshot', 'ReviewPanel', 'SlaBadge'],
  'Admin Observability': [
    'AlertsPanel', 'HealthSummary', 'LogFeedTable', 'SentryPanel',
    'SourceStatusNotice', 'SourceStatusPill', 'UserTimeline',
  ],
  'Admin QA': [
    'QaConsole', 'InspectTab', 'JobsTab', 'NotificationsTab', 'StateTab', 'WorkflowsTab',
    'PoolPicker', 'ActingUserFrame', 'BusySpinner', 'ConfirmPhraseInput', 'ErrorAlert',
    'FormField', 'IdList', 'MoneyField', 'SentResultAlert', 'SuccessAlert', 'WarningAlert',
  ],
};
const groupOf = Object.fromEntries(
  Object.entries(GROUPS).flatMap(([g, names]) => names.map((n) => [n, g])),
);

// ── Discovery ───────────────────────────────────────────────────────────────
function walk(d, out = []) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(p) && !/\.(stories|test|spec)\./.test(p)) out.push(p);
  }
  return out;
}

const files = walk(join(ROOT, 'components')).sort();
const project = new Project({
  skipAddingFilesFromTsConfig: true,
  compilerOptions: { jsx: ts.JsxEmit.Preserve, allowJs: true, skipLibCheck: true },
});

/** @type {{name:string,isDefault:boolean,file:string}[]} */
const rows = [];
for (const p of files) {
  const sf = project.addSourceFileAtPathIfExists(p);
  if (!sf) continue;
  for (const [name, decls] of sf.getExportedDeclarations()) {
    const real = name === 'default'
      ? decls.map((d) => d.getName?.()).find((n) => n && n !== 'default')
      : name;
    if (!real || !/^[A-Z][A-Za-z0-9]*$/.test(real)) continue;
    if (!decls.some((d) => Node.isVariableDeclaration(d) || Node.isFunctionDeclaration(d) || Node.isClassDeclaration(d))) continue;
    rows.push({ name: real, isDefault: name === 'default', file: relative(ROOT, p) });
  }
}

// Collisions would make `window.PoolDS.<Name>` ambiguous — fail loudly.
const byName = new Map();
for (const r of rows) {
  if (byName.has(r.name)) {
    console.error(`✗ duplicate export "${r.name}": ${byName.get(r.name).file} and ${r.file}`);
    process.exit(1);
  }
  byName.set(r.name, r);
}

// ── Emit the barrel ─────────────────────────────────────────────────────────
const byFile = new Map();
for (const r of rows) {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
}
const lines = [
  '// GENERATED by .design-sync/gen-entry.mjs — do not edit by hand.',
  '// Barrel entry for the design-sync bundle: every component export, including',
  '// compound sub-parts (they carry no preview card but must stay importable).',
  '',
];
for (const [file, rs] of [...byFile.entries()].sort()) {
  const spec = JSON.stringify('@/' + file.replace(/\.tsx$/, ''));
  const parts = rs
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => (r.isDefault ? `default as ${r.name}` : r.name));
  lines.push(`export { ${parts.join(', ')} } from ${spec};`);
}
writeFileSync(join(HERE, 'ds-entry.tsx'), lines.join('\n') + '\n');

// ── Emit doc stubs (category frontmatter drives the DS pane grouping) ───────
const docsDir = join(HERE, 'docs');
mkdirSync(docsDir, { recursive: true });
const cards = rows.filter((r) => !SUBPARTS.has(r.name) && !NON_VISUAL.has(r.name));
for (const r of cards) {
  const g = groupOf[r.name];
  if (!g) continue;
  const p = join(docsDir, `${r.name}.md`);
  // Never clobber a doc someone has written real prose into.
  if (existsSync(p) && !readFileSync(p, 'utf8').includes('<!-- category-stub -->')) continue;
  writeFileSync(p, `---\ncategory: ${g}\n---\n<!-- category-stub -->\n\n\`${r.name}\` — from \`${r.file}\`.\n`);
}

writeFileSync(
  join(HERE, '.generated.json'),
  JSON.stringify(
    {
      components: cards.map((r) => r.name).sort(),
      subparts: [...SUBPARTS].sort(),
      nonVisual: [...NON_VISUAL].sort(),
      srcMap: Object.fromEntries(rows.map((r) => [r.name, r.file])),
    },
    null,
    2,
  ) + '\n',
);

// Keep config.json's componentSrcMap in step with the curation above — it is
// what actually decides which components get a card, and a stale entry here
// silently ships a card for something that was just excluded.
const cfgPath = join(HERE, 'config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
cfg.componentSrcMap = Object.fromEntries(cards.map((r) => [r.name, r.file]).sort(([a], [b]) => a.localeCompare(b)));
for (const name of Object.keys(cfg.dtsPropsFor ?? {})) {
  if (!cfg.componentSrcMap[name]) delete cfg.dtsPropsFor[name];
}
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');

const ungrouped = cards.filter((r) => !groupOf[r.name]).map((r) => r.name);
console.error(`  entry: ${rows.length} exports from ${byFile.size} files`);
console.error(`  cards: ${cards.length} components (${SUBPARTS.size} sub-parts + ${NON_VISUAL.size} non-visual excluded)`);
if (ungrouped.length) console.error(`  ! ungrouped (will fall back to dir): ${ungrouped.join(', ')}`);
