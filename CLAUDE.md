# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test framework is configured.

## Architecture

**Next.js 15 (App Router) with React 19**, deployed on Vercel. Single web application (not a monorepo) for "POOL" — a group fund management service.

### Key Directories

- `app/` — Next.js app router: pages, layouts, API routes, and Firebase config
- `app/firebase/` — Firebase client config (`firebaseConfig.ts`) and Firestore service functions (`firestore.ts`)
- `app/api/` — API routes: `contact`, `preregister`, `questionnaire`, `location`, `update-site-visit`
- `components/` — Reusable React components; `components/ui/` is shadcn/ui primitives
- `lib/` — Utilities (classname merging, location detection, mobile helpers)
- `styles/` — Global and theme CSS

### Backend & Data

Two independent backends, deliberately kept separate:

- **Marketing site → Firebase Firestore** for the waitlist: `preregistered_users` collection, written by the public API routes (`app/api/{preregister,questionnaire,update-site-visit}`) and read by the legacy waitlist admin screens. **Unchanged.**
- **Platform-admin surface → the Pool API** (`api.poolapp.co` / `api-staging.poolapp.co`), a pure REST client — see *Platform-Admin Section* below.
- **Resend** for sending contact form emails.
- Firestore service layer lives in `app/firebase/services/firestoreService.ts`.

> **Firebase Auth is no longer used for admin login (#85).** The former email/password + `admins`-collection gate was removed. `app/firebase/services/authService.ts` now exports only a residual `signOut` (kept so the legacy waitlist screens compile). `firebaseConfig` + `firestoreService` + all `NEXT_PUBLIC_FIREBASE_*` env are kept for the marketing site.

### Platform-Admin Section (REST client, #85)

The `/admin` surface is a **pure REST client of the Pool API** — no Firebase-for-data. Auth is **Email-OTP + httpOnly cookies behind a Next server-side proxy**; tokens NEVER touch client JS and browser calls stay same-origin.

- **Environment switcher — Staging ⇄ Production (#112)**: the dashboard is no longer single-environment. `lib/admin/adminEnv.ts` is the **pure, client-safe** vocabulary module (which environments exist, their cookie names, their badge styling) shared by the nav, `middleware.ts` (edge) and the server-only `serverApi.ts`, so the three can never disagree about what `production` means. **Sessions are PER-ENVIRONMENT and that is the whole safety argument**: a Pool JWT is only valid for the API that issued it, so every session cookie is namespaced (`pool_admin_at__staging` / `__production`, via `adminCookies(env)` — there is no unscoped session-cookie name left in the codebase) and there is no code path that reads one environment's token and sends it to another. `serverApi` has **no ambient environment and no zero-arg `apiUrl()`** — every call takes an explicit `ApiEnv`, and the proxy resolves it ONCE per request so the base URL and the token cookie cannot be chosen separately. `POST /admin/api/env` (a route beside the catch-all, so it needs no session — you must be able to leave an environment you cannot authenticate against) writes the `pool_admin_env` cookie and **nothing else**: it mints no token and moves none. That cookie **confers no authority** — tampering with it just points the proxy at an environment you have no cookie for, i.e. a 401 → that environment's login, which is also the intended UX. `middleware.ts` gates on the SELECTED environment's cookie and imports only the pure modules (edge runtime). **The QA console's server-side gate now reads the SELECTED env**, not a build-time constant — a compile-time check would leave it reachable after a runtime flip to production. **PRODUCTION is deliberately the loudest thing on the page** (solid red badge + red header rule + a confirmation step to switch INTO it); staging stays amber. Logout is **scoped to the selected environment** (`?scope=all` ends them all) and the button says so. **⚠️ No cookie migration**: the pre-#112 unscoped cookies carry no record of which API issued them, so they are swept up on logout and never adopted — everyone re-logs in once. `POOL_API_BASE_URL` is preserved as the **default environment**, so the "simple prod-flip" still works on its own; `POOL_API_BASE_URL_{STAGING,PRODUCTION,LOCAL}` override the built-in defaults.
- **Auth flow** (`app/admin/api/auth/*` Route Handlers): `send-otp` → `verify-otp`. Both target the **selected environment's** API and write **that environment's** cookies. On verify, the server confirms platform-admin status by calling an identity-gated admin endpoint with the fresh Bearer (a non-admin JWT gets 403 → login rejected, no cookies). On success it sets httpOnly `pool_admin_at` / `pool_admin_rt` / `pool_admin_dt` cookies (`path=/admin`). `logout` best-effort revokes the device token and clears cookies. Cookie contract: `lib/admin/authCookies.ts`.
- **Proxy** (`app/admin/api/[...path]/route.ts`): same-origin catch-all. Reads the access-token cookie server-side, forwards GET/POST/PATCH/DELETE to `${POOL_API_BASE_URL}/api/v1/admin/<path>` with the Bearer. On a 401 it refreshes once via the refresh cookie, rewrites cookies, and retries. Because the browser→Next hop is same-origin and Next→API is server-to-server, **no poolmobile CORS change is needed**.
- **Guard**: `middleware.ts` gates `/admin/*` (excluding `/admin/api/*` and `/admin/login`) on the presence of the SELECTED environment's access-token cookie; `app/admin/layout.tsx` (server component) reads the same cookie to decide whether to paint the nav chrome, and additionally computes a per-environment "is there a session" boolean (presence only, never a token) for the switcher.
- **Client API**: `lib/admin/adminApi.ts` — typed fns over `fetch('/admin/api/<path>')`, no base URL/Bearer on the client, centralized 401 → `/admin/login`. DTOs hand-copied from poolmobile `@pool/shared` into `lib/admin/types.ts`.
- **Errors / Health tab** (`app/admin/errors`, poolmobile #192 over the #116 API): the READ surface for everything #26 made the API write. ONE endpoint — `GET /observability/errors` (static path, forwarded unchanged by the catch-all proxy; there is deliberately no `/summary` or `/sentry` route) — returns BOTH sources in a single **fail-open** payload, so the page's real job is that **an empty panel must never imply "nothing is wrong"**. Every panel carries a `SourceStatusNotice`; only `ok` licenses the words "no failures", and `disabled`/`unconfigured`/`unavailable` each say what was *not* queried. The signal tiles show **"—" rather than "0"** when the log source is untrustworthy (a zero from a source nobody read is a lie in the dangerous direction). The `bySignal` bar chart renders `SIGNAL_ORDER` **including zeros** — the API guarantees every key is present so a series never vanishes, and a signal at zero reads as *recovered*. The Sentry link-out is rendered from `issuesUrl` **independently of `status`** (the API returns it whenever the ORG SLUG is set, even with no read token, so an unwired token degrades to "open Sentry", not to a dead panel). ⚠️ **`path` / `message` / `errorMessage` / `requestId` are attacker-influenceable free text** (#116 review, L3/L4) — rendered as TEXT children only; no `dangerouslySetInnerHTML` on this surface, and no feed value is ever used as an `href`. The only hrefs are Sentry URLs, scheme-checked by `safeHttpUrl` (`href` still executes `javascript:`). Display vocabulary + the "why empty" copy live in `lib/admin/observability.ts` (a mirror of `@pool/shared`'s `OBSERVABILITY_FEED`, since this repo cannot import the poolmobile workspace; the API re-validates every bound with Zod, so drift degrades to a 400). Charts reuse the existing `components/ui/chart.tsx` convention — no new chart primitive, no new palette.
- **Critical-alert banner + alerting status (poolmobile #190, server half PR #211)**: `GET /observability/alerts` (identity-gated, **no query params** — the watched alarm set is a fixed reviewed list server-side) drives two things. **`CriticalAlertBanner` is mounted in `app/admin/layout.tsx`, not on a page** — an alarm firing while you read the Users table is exactly the case a tab cannot cover — inside the `hasSession` branch so it never appears on login, and with **no `env` prop**: it rides the same env-aware proxy as everything else, so it follows the #112 toggle for free and always reports the environment the badge names. It renders **only** when `criticalCount > 0` (a banner that is always present is a banner nobody sees; every other state is explained on the Errors tab), styled to match the #112 PRODUCTION chrome so "solid red across the top" means the same thing twice. **A failed poll never clears a known-critical state** — only a definitive successful read with `criticalCount === 0` takes it down (the house asymmetry: only a definitive answer may destroy state); polling pauses on a hidden tab and re-reads on return. **`AlertsPanel` sits above the filters on the Errors tab** (live state, not a query result — none of the feed filters apply to it). Honesty rules are #116's one level down: **`AdminAlarmState.Unknown` is NOT `ok`** — CloudWatch not returning an alarm means *nothing is watching that failure mode*, a live possibility on prod until #53, so it renders as **"Not reporting"** with a warning tone; a non-`ok` `status` renders "do not read the rows below as all-clear"; and **a quiet inbox is always explained** via `email.status` (`environment_not_eligible` is staging's normal, permanent state and must not read as a fault), with `recipientCount === 0` called out **even when armed** — an alerter with no recipients is silently useless. `stateReason` is rendered **here and only here** (it exists nowhere else in the product — the alert email deliberately carries no upstream text), as a plain text child like every other upstream string. **`label`/`description` are the SERVER's frozen copy**, so this repo carries no alarm map and a newly watched alarm arrives correctly labelled with no web deploy. Poll interval `ALERT_POLL_INTERVAL_MS` = 60s — the alarms evaluate on a 5-minute period, so faster cannot make the data fresher. **No new env vars.**
- **Screens**: `app/admin/overview` (metrics #80 + funnels #81), `app/admin/users` + `[id]` (list/search + suspend/restore + feature-flag toggle; a **disabled** "Impersonate (coming soon)" seam for the deferred #84), `app/admin/pools` + `[id]` (list + suspend/restore + read-only ledger #82), `app/admin/errors` (Errors/Health, see above). Money is integer cents, rendered via `lib/admin/format.ts`.
- **Legacy waitlist screens** (`app/admin/dashboard`, `app/admin/stats`) are **Firestore-backed and untouched**; they now sit behind the same OTP-cookie gate and are linked from the admin nav as "Waitlist".
- **QA console — STAGING ONLY** (`app/admin/qa`, poolmobile #132): a founders' console to trigger notifications, run scheduled jobs, drive multi-user workflows, set up state and inspect a user, instead of waiting on timers or contriving real events. Tabbed (Notifications · Jobs · Workflows · State · Inspect); components in `components/admin/qa/`, calls isolated in `qaApi` (`lib/admin/adminApi.ts`) + DTOs in the QA block of `lib/admin/types.ts`. All routes are namespaced `/qa/...` so the existing catch-all proxy forwards them unchanged — **no proxy change**. **Visibility is double-gated:** the page 404s server-side when `getApiEnv() === 'production'`, and the authoritative check is the API — **`GET /qa/status` returns 404 whenever the console is disabled server-side**, which the client treats as "disabled" (renders nothing, redirects to the overview). The nav entry (`NON_PROD_NAV_ITEMS` in `AdminNav`) is convenience only, never the gate. Guarded controls (broadcast-to-all, reseed, wipe, reset-account, force-pool-status) each require their own typed confirmation phrase **plus** `window.confirm` — the five phrases differ so a typo in one box can never trigger another action, and each is compared with strict equality (no trim/case-folding) exactly as the server does. Push/broadcast copy is additionally checked client-side against the API's money-free-copy rule (no currency symbols, decimal amounts or @handles on a lock screen). Two results get deliberately non-standard rendering: **reset-account resolves 200 with per-step failures inside it** (it is not atomic — a refused `leave_pool` on a pool OWNER is the normal case), so `steps[]` is always rendered per-step rather than as a flat success; and **force-pool-status is the one endpoint that bypasses the delegate-to-real-code rule**, so its returned `warning` is rendered verbatim in a `destructive` Alert at the same weight as the destructive controls.
- **Env**: `POOL_API_BASE_URL` (server-only — NOT `NEXT_PUBLIC_*`; defaults to staging) sets the **default environment**; `POOL_API_BASE_URL_{STAGING,PRODUCTION,LOCAL}` optionally override the built-in per-environment base URLs (#112). See `.env.local.example`.

### UI & Styling

- **Tailwind CSS** with custom brand colors (`pool-blue`, `pool-pink`, `pool-navy`, `money-green`, etc.) and custom animations defined in `tailwind.config.ts`
- **shadcn/ui** components configured via `components.json` (path alias `@/components/ui`)
- **Framer Motion** for animations
- **Radix UI** primitives underpin shadcn components
- Dark mode via `next-themes` (class-based)

### Forms & Validation

- `react-hook-form` with `zod` schemas via `@hookform/resolvers`
- Questionnaire saves progress to localStorage (`survey_progress` key)

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

## Environment Variables

- `POOL_API_BASE_URL` — **server-only** base URL of the Pool API used by the `/admin` Route Handlers + proxy (defaults to `https://api-staging.poolapp.co`). Never `NEXT_PUBLIC_*` — it must not be bundled into client JS.
- Firebase config vars are prefixed `NEXT_PUBLIC_FIREBASE_*` (marketing site + waitlist screens). The Firebase project ID is `pool-857f1`.

See `.env.local.example` for the full list.

## Package Manager

**pnpm** is canonical (`pnpm-lock.yaml`). `package-lock.json` was removed in #85.

## Build Notes

- TypeScript errors and ESLint warnings are **ignored** during `next build` (configured in `next.config.mjs`)
- Images are set to unoptimized mode

## Brand System — "sticker-pop" (mandatory for all UI work)

Pool is a **social network** for friend groups who spend time and money together — never describe or style it as a bill-splitting/expense/fintech app. The visual world: a kiddie pool with three stacked rings, money splashing in, thick navy outlines, flat fills, no gradients on illustration.

### Color tokens (Tailwind names / CSS vars in `app/globals.css`)

```
pool-blue   #4EC3F5   top ring, links, sky sections
pool-yellow #FFCE3E   middle ring, primary buttons
pool-pink   #FF77B0   bottom ring, pre-register CTA
pool-green  #63C666   bills, success
pool-gold   #F5B63C   coins
navy        #14224A   ALL outlines, text, hard shadows
cloud       #FDFCF9   page background
sky-tint    #EAF7FE   alternate section background
```

Rules: navy is the only text color on light backgrounds (use navy at reduced opacity for hierarchy — never gray). No gradients, no purple/indigo, no glassmorphism, no blurred blobs, no soft `shadow-lg`. White text on yellow is banned (fails contrast).

### Sticker construction (the unifying device)

Every interactive/card-like element: 2.5px solid navy border · hard offset shadow `4px 4px 0 var(--navy)` · radius 12–20px (pills for buttons) · hover lift `translate(-2px,-2px)` + 6px shadow · active press `translate(2px,2px)` + no shadow. Use the primitives: `.sticker`, `.btn-sticker` + `.btn-{yellow|blue|pink|ghost}`, `.chip-sticker`, or the `StickerButton`/`StickerCard`/`Chip` components in `components/sticker.tsx`. Transition `transform` only — never animate `box-shadow`, `filter`, or layout properties.

### Type & marks

- Display: Baloo 2 (`font-display`, weights 700/800) for H1/H2/wordmark only. Body: DM Sans (`font-sans`). Both via `next/font/google` in `app/layout.tsx`. Never use the display face for paragraphs.
- Brand marks are inline SVG in `components/brand/marks.tsx` (`PoolMark`, `Coin`, `Bill`, `Droplet`, `Splash`, `CloudMark`, `Wordmark`). Never scale the PNG logo for UI.

### Copy rules

- Keep verbatim: "Pool. Tap. Done." · "A social network for people who spend time — and money — together." · "WTF Is Pool?!" · "Ready to Jump In?" · "no IOUs, no awkward math, no receipts to chase."
- Banned in feature copy: split/splitting, settle/settling, expense(s), tracking-as-feature, fintech, seamless, effortless, elevate, unlock, empower. ("No IOUs / no tracking" as negation is allowed.)
- Voice: warm, direct, a little cheeky; short sentences; crews/moments/routines — never transactions or "financial wellness". Emoji only inside feed/ticker content, never as heading decoration.

### Motion & a11y budget

Animate `transform`/`opacity` only; all loops pause offscreen (IntersectionObserver) and on `visibilitychange`; `prefers-reduced-motion` gets static scenes; visible navy focus rings everywhere; decorative SVGs `aria-hidden`.
