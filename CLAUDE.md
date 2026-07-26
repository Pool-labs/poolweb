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

- **Auth flow** (`app/admin/api/auth/*` Route Handlers): `send-otp` → `verify-otp`. On verify, the server confirms platform-admin status by calling an identity-gated admin endpoint with the fresh Bearer (a non-admin JWT gets 403 → login rejected, no cookies). On success it sets httpOnly `pool_admin_at` / `pool_admin_rt` / `pool_admin_dt` cookies (`path=/admin`). `logout` best-effort revokes the device token and clears cookies. Cookie contract: `lib/admin/authCookies.ts`.
- **Proxy** (`app/admin/api/[...path]/route.ts`): same-origin catch-all. Reads the access-token cookie server-side, forwards GET/POST/PATCH/DELETE to `${POOL_API_BASE_URL}/api/v1/admin/<path>` with the Bearer. On a 401 it refreshes once via the refresh cookie, rewrites cookies, and retries. Because the browser→Next hop is same-origin and Next→API is server-to-server, **no poolmobile CORS change is needed**.
- **Guard**: `middleware.ts` gates `/admin/*` (excluding `/admin/api/*` and `/admin/login`) on the presence of the `pool_admin_at` cookie; `app/admin/layout.tsx` (server component) reads the same cookie to decide whether to paint the nav chrome.
- **Client API**: `lib/admin/adminApi.ts` — typed fns over `fetch('/admin/api/<path>')`, no base URL/Bearer on the client, centralized 401 → `/admin/login`. DTOs hand-copied from poolmobile `@pool/shared` into `lib/admin/types.ts`.
- **Screens**: `app/admin/overview` (metrics #80 + funnels #81), `app/admin/users` + `[id]` (list/search + suspend/restore + feature-flag toggle; a **disabled** "Impersonate (coming soon)" seam for the deferred #84), `app/admin/pools` + `[id]` (list + suspend/restore + read-only ledger #82). Money is integer cents, rendered via `lib/admin/format.ts`.
- **Legacy waitlist screens** (`app/admin/dashboard`, `app/admin/stats`) are **Firestore-backed and untouched**; they now sit behind the same OTP-cookie gate and are linked from the admin nav as "Waitlist".
- **Env**: `POOL_API_BASE_URL` (server-only — NOT `NEXT_PUBLIC_*`; defaults to staging). See `.env.local.example`.

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
