# Pool — building with this design system

Pool is a **social network for friend groups who spend time and money together**. Never
describe or style it as a bill-splitting, expense-tracking or fintech product. The visual
world is a kiddie pool with three stacked rings, money splashing in, thick navy outlines
and flat fills.

## Setup: no provider required

Components render fully styled with **no wrapper at all** — mount them directly. There is
no theme context to thread and no root provider to remember.

`ThemeProvider` exists in the bundle (a `next-themes` wrapper) but is **optional**: it only
toggles a `dark` class on `<html>`. Use it only when a design needs a dark-mode switch.

Everything visual comes from the stylesheet, so the one hard requirement is that
`styles.css` is loaded. It `@import`s `_ds_bundle.css`, which carries the compiled Tailwind
build, the brand tokens, the sticker component classes, and a font-host `@import` for the
two brand faces. **Read `_ds/<folder>/styles.css` and the `_ds_bundle.css` it imports before
styling anything** — they are the authority, and this file is only a summary.

### The one wrapper that IS required: `.hp` for Home sections

The **Home** group — `Hero`, `HowSteps`, `Wtf`, `SocialStory`, `CardStage`, `Jump`,
`HomeTicker`, `Falls` — is built on a hand-written CSS layer whose rules are scoped under
an `.hp` ancestor. Put those components inside `<div className="hp">` or they render with
unsized SVGs: the step coins fill the whole page, icons blow up to full width.

```jsx
<div className="hp">
  <Hero />
  <Wtf />
  <HowSteps />
</div>
```

The **Sections** group (`HeroPool`, `Footer`, `Header`, `PoolCards`, `FeedDemo`, …) does
**not** need the wrapper — those are Tailwind-styled and stand alone.

## The styling idiom: Tailwind utilities + sticker component classes

This is a **Tailwind** system. Style layout glue with utility classes; the shipped
stylesheet includes the full utility vocabulary listed below, not just what the repo
happens to use, so these all resolve.

### Brand colours

Use these as `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*`, with `/10`…`/95`
opacity suffixes and `hover:` / `focus:` / `active:` / `dark:` variants.

| Token | Hex | Role |
|---|---|---|
| `pool-blue` | `#4EC3F5` | top ring, links, sky sections |
| `pool-yellow` | `#FFCE3E` | middle ring, primary buttons |
| `pool-pink` | `#FF77B0` | bottom ring, pre-register CTA |
| `pool-green` | `#63C666` | bills, success |
| `pool-gold` | `#F5B63C` | coins |
| `navy` | `#14224A` | **all** outlines and text |
| `cloud` | `#FDFCF9` | page background |
| `sky-tint` | `#EAF7FE` | alternate section background |
| `pool-sky`, `tint-yellow`, `tint-pink`, `tint-green` | — | flat section-band tints |

shadcn semantic tokens are mapped onto the same palette and also available:
`bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `bg-secondary`,
`bg-muted`, `text-muted-foreground`, `bg-accent`, `bg-destructive`, `bg-card`, `bg-popover`,
`border-border`, `border-input`, `ring-ring`.

**Rules:** navy is the only text colour on light backgrounds — use `text-navy` at reduced
opacity (`text-navy/70`) for hierarchy, **never gray**. No gradients, no purple/indigo, no
glassmorphism, no blurred blobs, no soft `shadow-lg`. **White text on yellow is banned**
(fails contrast).

### Sticker construction — the unifying device

Every interactive or card-like element is a die-cut sticker: **2.5px solid navy border, hard
offset shadow `4px 4px 0 navy`, radius 12–20px** (pills for buttons), hover lift
`translate(-2px,-2px)` + 6px shadow, active press `translate(2px,2px)` + no shadow.

Prefer the components (`StickerButton`, `StickerCard`, `Chip`). When you need the look on
your own markup, use these real classes from `_ds_bundle.css`:

| Class | What it is |
|---|---|
| `.sticker` | card shell — white fill, navy border, hard shadow, 16px radius |
| `.sticker-interactive` | adds the hover-lift / active-press transitions |
| `.btn-sticker` | pill button shell |
| `.btn-yellow` `.btn-blue` `.btn-pink` `.btn-ghost` | button fills — pair with `.btn-sticker` |
| `.chip-sticker` | small bordered pill |
| `.text-sticker` | navy outline + hard shadow for display headings |
| `.svg-sticker-text` | the same treatment for SVG text (wordmark) |
| `.ticker-track` / `.ticker-paused` | marquee track and its pause state |
| `.cloud-drift` `.cloud-drift-slow` `.air-bob` | ambient drifters; `.anim-paused` stops them |
| `.reveal` + `.is-visible` | scroll reveal (starts at `opacity: 0` — needs `.is-visible`) |
| `.feed-item` / `.feed-pop` + `.is-shown` | feed entry transitions (also start hidden) |

### Type

Display face **Baloo 2** via `font-display` — **H1/H2 and the wordmark only, never body
copy**. Body face **DM Sans** via `font-sans`. Both load from a font host at runtime; no
local font files ship. Use `font-extrabold` for display headings.

### Motion and accessibility

Animate **`transform` and `opacity` only** — never `box-shadow`, `filter` or layout
properties. `prefers-reduced-motion` is already honoured by the shipped CSS. Keep visible
navy focus rings; mark decorative SVG `aria-hidden`.

## Composing components

Compound components ship their sub-parts as separate exports — they have no preview card of
their own but are fully importable:

- `Card` → `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Accordion` → `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- `Tabs` → `TabsList`, `TabsTrigger`, `TabsContent`
- `Select` → `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`
- `Table` → `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`, `TableFooter`
- `Alert` → `AlertTitle`, `AlertDescription`
- `Avatar` → `AvatarImage`, `AvatarFallback`
- `InputOTP` → `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`

Each component's `<Name>.d.ts` is the API contract; its `<Name>.prompt.md` has usage. Beyond
the props listed there, every component spreads the remaining standard DOM props onto its
root element.

**Which button:** `StickerButton` for marketing and brand surfaces (it is the sticker pill,
and takes `href` to render an anchor). `Button` is the shadcn button used on app and admin
screens. `BurstButton` is a link CTA that bursts droplets on click.

## Copy rules

Keep verbatim: **"Pool. Tap. Done."** · **"A social network for people who spend time — and
money — together."** · **"WTF Is Pool?!"** · **"Ready to Jump In?"** · **"no IOUs, no awkward
math, no receipts to chase."**

Banned in feature copy: *split/splitting, settle/settling, expense(s), tracking-as-feature,
fintech, seamless, effortless, elevate, unlock, empower.* ("No IOUs / no tracking" as a
negation is fine.)

Voice: warm, direct, a little cheeky. Short sentences. Talk about crews, moments and
routines — never transactions or "financial wellness". Emoji only inside feed/ticker
content, never as heading decoration.

## An idiomatic example

```jsx
<section className="bg-cloud px-6 py-16">
  <div className="mx-auto max-w-3xl text-center">
    <h2 className="font-display text-4xl font-extrabold text-navy">Ready to Jump In?</h2>
    <p className="mt-3 text-navy/70">
      Your friends, your routines, your moments — all in one place.
    </p>

    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <StickerCard interactive className="p-6 text-left">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-extrabold">Brunch Crew</h3>
          <Chip>5 in</Chip>
        </div>
        <p className="mt-2 text-sm text-navy/80">
          Everyone chips in on Friday. No IOUs, no awkward math.
        </p>
      </StickerCard>

      <StickerCard className="bg-pool-yellow p-6 text-left">
        <span className="font-display text-3xl font-extrabold">$2,480</span>
        <p className="mt-1 text-sm text-navy/80">pooled this month</p>
      </StickerCard>
    </div>

    <div className="mt-8 flex flex-wrap justify-center gap-4">
      <StickerButton href="/preregister" variant="yellow">Pre-register</StickerButton>
      <StickerButton href="#how-it-works" variant="ghost">See how it works</StickerButton>
    </div>
  </div>
</section>
```
