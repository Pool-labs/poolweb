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
- **Screens:** Overview (usage metrics + funnels), Users (search / suspend-restore / feature flags), Pools (search / suspend-restore / read-only ledger), Errors & Health (recent API failures + Sentry issues, with an explicit per-source "why is this empty" status). The legacy Firestore-backed waitlist dashboard/stats live under the same gate (linked as "Waitlist").
- **Package manager:** **pnpm** (`pnpm-lock.yaml`).

### Environment

Set `POOL_API_BASE_URL` (server-only — not `NEXT_PUBLIC_*`) to the Pool API base URL. Defaults to `https://api-staging.poolapp.co`. Copy `.env.local.example` to `.env.local` and fill in the Firebase (`NEXT_PUBLIC_FIREBASE_*`) values for the marketing site.

`POOL_API_BASE_URL` now sets the **default environment** the dashboard opens on; the switcher can move to the other one at runtime with no redeploy. Staging and production have built-in base URLs, so the toggle needs no extra config — set `POOL_API_BASE_URL_STAGING` / `POOL_API_BASE_URL_PRODUCTION` only to point an environment somewhere else.

On Vercel, add `POOL_API_BASE_URL` as an environment variable (Production → `https://api.poolapp.co`, Preview/staging → `https://api-staging.poolapp.co`).
