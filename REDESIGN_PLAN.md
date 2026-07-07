# Pool Redesign Plan — sticker-pop

Phase 0 record for the `redesign/sticker-pop` branch. See `REDESIGN_BRIEF.md` for the full brief.

## Repo inventory

- **Stack:** Next.js 15.5.15 (App Router), React 19, Tailwind 3.4, shadcn/ui (Radix), Firebase, Resend. Deployed on Vercel.
- **Fonts today:** Inter via `next/font/google` (no Geist — good).
- **Landing page** (`app/page.tsx`): centered hero with PNG logo → beta notice card → "WTF Is Pool?!" with `FeaturesCarousel` → "How It Works" with `HowItWorksCarousel` → CTA card. Glassmorphism (`bg-white/20 backdrop-blur`), gradient buttons, gradient text — all anti-slop violations.
- **Duplicated DOM source found:** `components/features-carousel.tsx` and `components/how-it-works-carousel.tsx` each mount a desktop grid **and** a mobile Embla carousel with identical content (`hidden md:grid` + `md:hidden`). Fix: one responsive layout per section, no Embla on the landing route.
- **`components/decorative-background.tsx`:** ~20 giant blurred gradient blobs, fixed full-screen, animating `filter`-heavy layers. Removed entirely (blurred-blob backgrounds are on the anti-slop list and a perf drain).
- **`app/mobile.css`:** hacks tied to the old design (global text-size remaps, blur overrides, `html::before/after` gradient overlays, fixed-header padding). Visual parts get removed; behavioral helpers (`--vh`, `.mobile-container`, `.bottom-nav`, touch target sizes) stay for the app-like routes.
- **Dead v0 code:** `site-header.tsx`, `site-footer.tsx`, `mode-toggle.tsx` (unreferenced) — removed in Phase 5 alongside the old carousels and decorative background.
- **Out of scope (untouched):** `app/api/*`, `app/firebase/*`, form handlers in contact/preregister/questionnaire, admin section, app-like routes (`/pools`, `/wallet`, `/pay`, `/create`, `/join`, `/pool-details`), analytics, `package.json` deps.

## Final tokens

Sampled against the provided brand PNGs; brief starting values confirmed.

```css
--pool-blue:   #4EC3F5;  /* top ring, links, sky sections */
--pool-yellow: #FFCE3E;  /* middle ring, primary buttons */
--pool-pink:   #FF77B0;  /* bottom ring, pre-register CTA */
--pool-green:  #63C666;  /* bills, success */
--pool-gold:   #F5B63C;  /* coins */
--navy:        #14224A;  /* every outline, all text, hard shadows */
--cloud:       #FDFCF9;  /* page background */
--sky-tint:    #EAF7FE;  /* alternate band */
```

Tailwind names: `pool-blue`, `pool-yellow`, `pool-pink`, `pool-green`, `pool-gold`, `navy`, `cloud`, `sky-tint`. Legacy names (`pool-navy`, `pool-purple`, `money-green`, …) remain mapped for untouched routes but new work never uses purple/gray.

**Sticker construction (the unifying device):** 2–3px solid navy border · hard offset shadow `4px 4px 0 var(--navy)` · radius 12–20px (pills for buttons) · hover lift `translate(-2px,-2px)` + 6px shadow · active press `translate(2px,2px)` + 0 shadow. Implemented as `.sticker`, `.sticker-btn` (yellow/blue/pink variants), `.sticker-chip` utility classes.

**Type:** Baloo 2 (display, 700/800 — H1/H2/wordmark only) + DM Sans (body), both `next/font/google`, `display: swap`. Hero H1 gets layered navy text-shadow for the sticker outline.

## Landing wireframe

```
┌────────────────────────────────────────────────────────────┐
│ NAV  [◎ POOL]      How it works · FAQ · Contact  [Pre-register]│  cloud bg, 2px navy bottom border
├────────────────────────────────────────────────────────────┤
│ HERO (cloud, faint radial warmth, drifting SVG clouds)     │
│  ┌──────────────────────┐   ┌───────────────────────────┐  │
│  │ Pool. Tap. Done.     │   │      ~ interactive ~      │  │
│  │ (sticker-outline H1) │   │   three-ring pool scene   │  │
│  │ subline              │   │  bills flutter, coins     │  │
│  │ [Pre-register] [See  │   │  plink, click = toss coin │  │
│  │  how it works]       │   └───────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│ TICKER  🏖️ Beach House — Alex tapped $63 at Costco · ☕ …   │  navy strip, CSS marquee
├────────────────────────────────────────────────────────────┤
│ WTF IS POOL?!  (cloud)                                     │
│   [Brunch Crew -2°] [Ski Trip '26 +1°] [Apartment 4B -1°]  │  sticker pool-cards w/ avatars,
│   distributed copy under/around cards                      │  balance, one feed line
├────────────────────────────────────────────────────────────┤
│ SHARED MOMENTS (sky-tint band, drifting clouds)            │
│   ┌ phone frame ┐  copy: feed demo explanation             │
│   │ auto-playing│                                          │
│   │ Lake Weekend│                                          │
│   └─────────────┘                                          │
├────────────────────────────────────────────────────────────┤
│ HOW IT WORKS (cloud)                                       │
│   ① Create Your Pool ··droplet path··▶ ② Bring In Your     │
│   People ··▶ ③ Tap. Done.   (scroll reveal, once)          │
├────────────────────────────────────────────────────────────┤
│ READY TO JUMP IN? — "The pool's not open yet."             │
│   [big pink Pre-register w/ droplet burst]                 │
├────────────────────────────────────────────────────────────┤
│ FOOTER (navy) — reverse marks, socials, Questionnaire +    │
│   Download links, "Made with 🌊 in St. Louis."             │
└────────────────────────────────────────────────────────────┘
```

## Hero scene approach

- `components/hero-pool.tsx` — client component whose initial render is the complete static SVG scene (pool, money pile, clouds), so SSR HTML matches and there is zero hydration layout shift.
- **Ambient loop:** a `setTimeout` scheduler spawns one bill (or occasionally a coin) every ~2.5–4s. Each spawn is a `<g>` positioned with CSS custom transforms and animated with **WAAPI** (`element.animate`) — fall + sway on the wrapper, rotation on the child; landing triggers a splash sprite (`<use href="#splash">`) removed after <600ms. Hard cap ~6 ambient elements live at once.
- **Coin toss:** pointerdown anywhere in the hero maps the point into SVG viewBox space, animates a coin along a precomputed arc (translate X linear + translate Y with `cubic-bezier(.2,-0.6,.7,1)` overshoot for the parabola), splash on landing, then the coin joins a persistent pile array (React state, cap 30, oldest recycled) at a slightly randomized resting slot inside the top ring.
- **Pausing:** one `IntersectionObserver` on the scene + `visibilitychange` listener toggle a paused flag — scheduler stops, in-flight WAAPI animations `pause()`/`play()`.
- **Reduced motion:** `matchMedia('(prefers-reduced-motion: reduce)')` — no scheduler, static scene includes one frozen splash; clicking still appends a coin instantly (no animation).
- No physics lib, no framer-motion, no rAF loops; `transform`/`opacity` only.

## Per-phase commits

One commit per phase boundary on `redesign/sticker-pop`, verified by `npm run build` (plus screenshots if tooling cooperates) before each commit.
