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
