# design-sync notes — poolWebApp

Repo-specific gotchas for `/design-sync`. Read this before re-syncing.

Project: **Pool Web App Design System** — https://claude.ai/design/p/a0095e69-de7e-4d14-aaee-7eb3a01ee6bf
Shape: `package`. 79 component cards from 120 exports across 67 files.

## The one thing to know

**This repo is a Next.js app, not a component package.** There is no `dist/`, no
`.d.ts` tree, no `main`/`module`/`exports` in `package.json`, and most components are
DEFAULT exports. Almost everything below follows from that.

## Re-sync command

```sh
# 1. regenerate the inputs (in this order — each feeds the next)
node .design-sync/gen-entry.mjs        # barrel + doc stubs + componentSrcMap
node .design-sync/gen-dts-props.mjs    # cfg.dtsPropsFor from source
node .design-sync/gen-safelist.mjs     # Tailwind class candidates
node .design-sync/build-css.mjs        # compiles Tailwind → .design-sync/compiled.css

# 2. fetch the anchor, then run the driver
#    (DesignSync get_file _ds_sync.json → .design-sync/.cache/remote-sync.json)
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --entry .design-sync/ds-entry.tsx --out ./ds-bundle \
  --remote .design-sync/.cache/remote-sync.json --no-render-check
```

Drop `--no-render-check` once a browser is available (see "Verification" below).

## Why each helper script exists

- **`gen-entry.mjs`** — the converter's synth entry is `export * from <file>`, which cannot
  re-export DEFAULT exports; most components here are defaults, so `window.PoolDS.Hero`
  would be undefined. It writes an explicit barrel (`ds-entry.tsx`, passed via `--entry`)
  exporting all 120 names. It also owns the curation: 34 compound sub-parts and 7
  non-visual exports stay in the bundle but get no card, and it keeps
  `cfg.componentSrcMap` in step. **Re-run it whenever a component is added or removed.**
- **`gen-dts-props.mjs`** — with no `.d.ts` tree the extractor emitted
  `[key: string]: unknown` for all 79 components. This resolves real props from source and
  writes `cfg.dtsPropsFor`. Note it type-checks each body as **`.ts`, not `.d.ts`**:
  `skipLibCheck` (which `package-validate.mjs` also sets) silently suppresses every
  diagnostic inside a declaration file, so an unresolvable name there passes validate and
  only breaks in the design agent's editor.
- **`gen-safelist.mjs` + `build-css.mjs`** — `app/globals.css` is Tailwind SOURCE
  (`@tailwind` directives). It must be compiled or every preview and every design renders
  unstyled. And because Tailwind only emits classes it can SEE, a build scanning only this
  repo styles this repo's components and nothing else — the moment the design agent writes
  its own layout glue (`p-7`, `bg-pool-gold`, `w-1/3`) that markup is unstyled. The
  safelist enumerates ~14.4k class candidates so the vocabulary in `conventions.md`
  actually resolves. Output is ~1 MB, built in ~3s.
  **Do NOT use `safelist: [{pattern: /./, variants: [...]}]`** — tried it, it is a
  combinatorial explosion that OOMs node rather than finishing.

## Config choices worth knowing

- `srcDir: "components"` — the default probe order is `src` → `lib` → `components`, and
  this repo HAS a `lib/` (utilities, no components), so it would pick the wrong root.
- `tsconfig: ".design-sync/tsconfig.dssync.json"` — resolves `@/*` **and** aliases
  `next/link` / `next/navigation` to `.design-sync/shims/`. The design runtime has no Next
  router; without the shims those components throw. Add a shim if a component starts
  importing another `next/*` module.
- **Grouping**: the src-directory name wins over the doc-stub `category:` frontmatter
  whenever the directory yields a non-generic segment. So `components/ui/*` (generic → falls
  through) takes its category from the stub, while `components/admin/qa/*` groups as `qa`
  from the directory regardless of the stub saying `Admin QA`. The GROUPS labels in
  `gen-entry.mjs` for the admin sub-trees are therefore cosmetic — reality is
  `admin`/`moderation`/`observability`/`qa`.
- Fonts (Baloo 2, DM Sans) come from `next/font/google` in the real app, which does not run
  here. `.design-sync/css-entry.css` loads them from the Google Fonts host and binds
  `--font-sans` / `--font-display`. Validate reports `[FONT_REMOTE]` — expected, not a
  problem. No font files ship.

## Verification — READ THIS

**No preview has ever been machine-rendered or visually graded.** The user declined the
Playwright/Chromium install (twice, after the tradeoff was spelled out), so
`package-validate.mjs` runs with `--no-render-check` and `package-capture.mjs` cannot run at
all — meaning `.resync-verdict.json` will always report `capture: ok:false, exit 2` and a
top-level `ok: false`. **That single stage is the only thing failing; build, diff and
validate all pass.** There are no grades in `.design-sync/.cache/review/`.

The substitute is **`.design-sync/smoke.mjs`** — loads every card in jsdom, mounts the real
component from the real bundle, and reports anything that throws or comes up empty. Last
full run: **79 cards — 78 mounted, 1 floor card, 0 empty/thin.** It is NOT a visual grade:
jsdom has no layout engine, so it cannot see unstyled text, collapsed spacing, wrong
colours, or variants that look identical.

Two things it took real debugging to get right — do not undo them:
- It **inlines every `<script src>`** before parsing. With jsdom's `resources: 'usable'`
  the external loads race the card's inline mount script, so the same card reported
  "mounted" on one run and "empty" on the next. Several components were wrongly diagnosed
  as broken before this was found.
- It **stubs `getBoundingClientRect`, IntersectionObserver, ResizeObserver, matchMedia and
  `fetch`**. Without the rect stub the card's own fallback logic (`height < 2`) fires on
  every component; without a `fetch` stub, data-loading components report
  "fetch is not defined" instead of sitting in their loading state.

A full smoke run takes ~10 minutes (the 1.7 MB bundle is parsed once per card). Use
`--only Name,Name` while iterating; `--dump` prints a card's rendered DOM.

## Known render warns / deliberate exceptions

- **`CriticalAlertBanner` ships the floor card on purpose.** It renders `null` unless a
  CloudWatch alarm is actually firing, and it polls the API — there is no static state to
  preview. Its authored preview was deleted rather than faked.
- **`HomeEffects` is excluded from the card list** (it is in `NON_VISUAL` in
  `gen-entry.mjs`). Its own source comment says "Renders nothing." — it is a `useEffect`-only
  mount. Still exported from the bundle.
- **`Falls`** renders 34 elements and zero text — correct, it is a decorative SVG curtain.
  Its preview gives it a sized `relative` container or it is invisible.
- **`QaConsole` / `InspectTab`** render their loading shell only; they fetch from
  `/admin/api/*`, which does not exist in the design runtime.
- `.reveal`, `.feed-item` and `.feed-pop` start at `opacity: 0` and need a JS-added
  `.is-visible` / `.is-shown`. `BetaCta`, `HowItWorks` and `FeedDemo` depend on this; they
  render because the smoke harness's IntersectionObserver stub reports intersecting
  immediately. In a real browser they animate in normally.

## Preview authoring conventions used here

All 79 previews are hand-authored in `.design-sync/previews/` (committed, never touched by
the converter). Admin/QA components take real Pool API DTOs — the shapes were read out of
`lib/admin/types.ts` and are passed with `as never` to sidestep the full DTO type while
keeping the runtime shape honest. Where a shape was guessed wrong it showed up immediately
as a smoke error (`UserTimeline` threw on `metadata: null`; `KeyValues` calls
`Object.entries` on it, so it is always an object on the wire).

## Re-sync risks — what can silently go stale

- **DTO shapes are inlined into previews.** `lib/admin/types.ts` is the source of truth and
  the previews duplicate fragments of it (`QaStatus`, `AdminAlertState`, `ObservabilityLogEntry`,
  `AuditLogEntry`, report enums…). A server-side DTO change will not fail the build — the
  preview just renders wrong or throws. Re-run `smoke.mjs` after any `lib/admin/types.ts` change.
- **The safelist is hand-enumerated.** New Tailwind theme values (a new brand colour in
  `tailwind.config.ts`, a new animation) need adding to `gen-safelist.mjs`, or the class
  ships undefined. The brand colour list there mirrors `tailwind.config.ts` — keep them in step.
- **`conventions.md` names ~83 classes and ~46 component names.** They all verified against
  the built artifacts on this run. Re-validate after any rename; a name that stops resolving
  makes the design agent write vocabulary that silently does nothing.
- **No visual verification exists.** Everything above about "renders correctly" means
  "mounts in jsdom with plausible text". First person with a browser should install
  Playwright and run the real render check + `package-capture.mjs` grading.
- **Toolchain assumed**: node 22.15, pnpm 10.15 (`COREPACK_ENABLE_STRICT=0` was set for the
  install), Tailwind 3.4.17, converter deps installed under `.ds-sync/` via npm.
- **Fonts are fetched from the Google Fonts host at runtime.** If the design environment
  blocks that host, every design falls back to system fonts and nothing will report it.
