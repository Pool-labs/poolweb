# Pool

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/hussams-projects-151317ba/v0-pool)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/weYAYJ68wbN)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/hussams-projects-151317ba/v0-pool](https://vercel.com/hussams-projects-151317ba/v0-pool)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/weYAYJ68wbN](https://v0.app/chat/projects/weYAYJ68wbN)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Platform Admin (`/admin`)

The `/admin` surface is a **pure REST client of the Pool API** (issue #85) — it does not use Firebase for data.

- **Environments:** a **Staging ⇄ Production toggle** in the admin nav (#112). Sessions are **per environment** — a Pool JWT is only valid for the API that issued it, so cookies are namespaced (`pool_admin_at__staging` / `__production`), you sign into each environment separately, and no token is ever reused across them. Switching to an environment you are not signed into lands on that environment's login. **PRODUCTION is visually loud** (red badge, red header rule) so staging numbers are never read as production ones.
- **Alerting:** a persistent **critical-alert banner** across the whole `/admin` surface when a production-critical CloudWatch alarm is firing (poolmobile #190), plus an alerting/email-status section on Errors & Health. It follows the selected environment automatically. An alarm CloudWatch does not report renders as **"Not reporting"**, never as healthy, and a quiet alert inbox always says why.
- **Auth:** Email-OTP + httpOnly cookies behind a Next server-side proxy. Tokens never touch client JS; browser calls stay same-origin, and the Next server calls the Pool API server-to-server. Login also verifies platform-admin status before setting any cookie (a non-admin account is rejected).
- **Moderation:** a **reports queue** over the poolmobile #158 API — oldest-first, exactly as the API serves it, with a live countdown against the published turnaround (triage 24h / resolution 72h). A report's detail shows the **evidence snapshot** taken at report time, clearly separated from live content and from the reporter's own description. A review can **remove the reported message** (message reports only); **suspending an account is not duplicated here** — it links to the user's page, where suspension already lives with its own audit trail.
- **Screens:** **Stats** (the whole site's data in eight tabs — Growth · Activity · Pools · Money · Engagement · Funnels · Geography · Health — over one range control, with charts, a delta against the previous window on every windowed tile, and an explained empty state on any panel that could not be served), Users (search / city filter / create / suspend-restore / feature flags), Pools (search / city filter / create / suspend-restore / read-only ledger), Moderation (reports queue + review), Support (read and answer in-app support threads), Errors & Health (recent API failures + Sentry issues, with an explicit per-source "why is this empty" status). The legacy Firestore-backed waitlist dashboard and its questionnaire statistics live under the production-only gate (linked as "Waitlist").
- **Package manager:** **pnpm** (`pnpm-lock.yaml`).
- **CI:** `.github/workflows/ci.yml` runs typecheck, lint, unit tests and the build on every PR and every push to `main` (poolweb#7 — the repo had no automated gate at all before this). The Playwright suite stays out of CI on purpose: its admin half logs into **staging** with a real OTP.

### Environment

Set `POOL_API_BASE_URL` (server-only — not `NEXT_PUBLIC_*`) to the Pool API base URL. Defaults to `https://api-staging.poolapp.co`. Copy `.env.local.example` to `.env.local` and fill in the Firebase (`NEXT_PUBLIC_FIREBASE_*`) values for the marketing site.

`POOL_API_BASE_URL` now sets the **default environment** the dashboard opens on; the switcher can move to the other one at runtime with no redeploy. Staging and production have built-in base URLs, so the toggle needs no extra config — set `POOL_API_BASE_URL_STAGING` / `POOL_API_BASE_URL_PRODUCTION` only to point an environment somewhere else.

On Vercel, add `POOL_API_BASE_URL` as an environment variable (Production → `https://api.poolapp.co`, Preview/staging → `https://api-staging.poolapp.co`).

## Waitlist data (Firestore)

The marketing waitlist (`/preregister`, `/questionnaire`) is stored in Firestore, project `pool-857f1`, collection `preregistered_users`. **All access is server-side** through the Firebase Admin SDK (`lib/server/firebaseAdmin.ts`, `lib/waitlist/store.ts`); the browser never talks to Firebase, and the committed `firestore.rules` denies all client access.

- **Public routes** — `POST /api/preregister`, `/api/questionnaire`, `/api/update-site-visit`. Bodies are validated against an allowlist (`lib/waitlist/schema.ts`), lookups are point reads (new entries are keyed by the sha256 of the normalized email), and every route answers the same way whether or not an address is already on the list.
- **Admin screens** — `/admin/dashboard` (Waitlist) and `/admin/dashboard/stats` (its questionnaire statistics) render only with **Production** selected — note `/admin/stats` is the platform Stats page, which every environment gets — and their data comes from `GET/DELETE /admin/api/waitlist[/:id]`, which proves a platform-admin session against the production Pool API before touching Firestore. Deletions are logged to `waitlist_deletions` (entry id, time, admin's Pool user id).
- **Credential** — `FIREBASE_SERVICE_ACCOUNT_JSON` (server-only, Vercel *Sensitive*): the full service-account key JSON. Without it the waitlist routes return 503.

### Runbook: credential and rules

1. Firebase console → Project settings → Service accounts → **Generate new private key**. Paste the whole JSON into Vercel as `FIREBASE_SERVICE_ACCOUNT_JSON` (Production and Preview, marked Sensitive). Delete the downloaded file.
2. Deploy. Check the waitlist form works (`/preregister`).
3. Publish the rules in `firestore.rules`: paste them into Firebase console → Firestore → Rules, or run `firebase deploy --only firestore:rules --project pool-857f1`. Do this only **after** step 2 — the rules deny everything the old client-side code relied on.
4. To rotate the key: generate a new one, update the Vercel variable, redeploy, then delete the old key in Google Cloud → IAM → Service accounts.

Request volume on the public routes is not limited in code (an in-memory counter is not reliable across Vercel instances). If they are abused, add a Vercel Firewall rate-limit rule for `/api/preregister`, `/api/questionnaire`, `/api/update-site-visit` and `/api/contact`.

## Tests

`pnpm test` runs the unit tests (vitest, `tests/unit`, offline — Firestore is faked). `pnpm typecheck` runs `tsc`. The Playwright suite (`pnpm e2e`) is separate and staging-only; see `tests/e2e/README.md`.
