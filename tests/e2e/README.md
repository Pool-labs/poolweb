# Playwright suite — admin dashboard + marketing site (poolmobile #594)

Drives the dashboard and the marketing site in a real Chromium, served
**locally** (`next start -p 3100`) with the admin surface pointing at
**staging** (`POOL_API_BASE_URL` defaults to `https://api-staging.poolapp.co`;
the env switcher's default resolves the same way).

⚠️ **Staging only.** The login setup refuses to send even an OTP unless the
server-resolved environment banner reads `STAGING`. Never point anything in
this suite at `api.poolapp.co`.

## Running it

```bash
pnpm install

# Admin specs need the Mailtrap capture-inbox credentials (see below) —
# without them the admin specs SKIP with a clear message and the marketing
# specs still run.
export MAILTRAP_POP3_USER=$(aws secretsmanager get-secret-value \
  --secret-id pool-staging/mailtrap-user --query SecretString --output text)
export MAILTRAP_POP3_PASS=$(aws secretsmanager get-secret-value \
  --secret-id pool-staging/mailtrap-pass --query SecretString --output text)

pnpm e2e        # next build, then the whole suite
pnpm e2e:test   # suite only (assumes a build exists / a server on :3100)
```

Browsers: `@playwright/test` is pinned to `1.63.0`, whose Chromium revision
(1243) is expected in the default cache (`~/Library/Caches/ms-playwright`). If
it is missing, `pnpm exec playwright install chromium` fetches it once.

## Environment variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `MAILTRAP_POP3_USER` / `MAILTRAP_POP3_PASS` | for admin specs | Staging capture-inbox credentials — the same pair the server uses for SMTP. Live in AWS Secrets Manager as `pool-staging/mailtrap-{user,pass}`. Read at runtime only; **never commit them anywhere.** |
| `E2E_ADMIN_EMAIL` | no | Platform-admin account to log in as (default `yousef.langi@poolapp.co`). |
| `MAILTRAP_POP3_HOST` / `MAILTRAP_POP3_PORT` | no | Default `pop3.mailtrap.io` / `1100`. |

## How login works (no auth path weakened)

Staging suppresses real email (#133/#256): every login code lands in one
Mailtrap capture inbox. The setup project (`auth.setup.ts`):

1. Opens `/admin/login`, **asserts the banner says STAGING**, fills the admin
   email and clicks the dashboard's own **Send code** — the same
   `/admin/api/auth/send-otp` → gated `/admin/auth/send-otp` path a founder
   takes. No test-only branch exists near `verify-otp` (its
   enumeration-safety property, poolmobile #387, is load-bearing).
2. Reads the code over **POP3** (`tests/e2e/helpers/pop3.ts`, dependency-free).
   ⚠️ The inbox listing has **no ordering contract** (poolmobile #570's
   retraction): the message is matched by **recipient + Date ≥ the send
   moment**, and the latest match wins — never "the last message".
3. Types the code into the dashboard's OTP form and saves the browser's
   storage state to `tests/e2e/.auth/` (gitignored), which every admin spec
   reuses. A still-valid state from a previous run is reused without a fresh
   OTP (each OTP login mints a trusted-device row server-side).

## What is deliberately NOT exercised

- **QA console**: rendered, never touched — every control there mutates
  staging (reseed, wipe, reset-account, broadcast).
- **Suspend / restore / feature flags / Add-remove admin**: rendered, never
  clicked.
- **The #313 gate is never armed**: the #589 regression proves the proxy
  forwards `PUT` by sending a version string the API's own validation refuses
  (400 from the API ≠ 405 from Next), then proves nothing changed. Staging's
  requirements must stay `null` — arming them blocks real staging installs.
- **Waitlist submission**: the `/preregister` form is asserted to render and
  validate client-side only, with the submit endpoint intercepted to prove no
  request left the page — a real submit writes into the single PRODUCTION
  Firestore (poolmobile #602's subject).
- **User logs**: fetched exactly once per run (each fetch writes an
  `admin.user_logs_viewed` audit row by design).

## What DOES write, and why

- **View as** (`admin/view-as.spec.ts`, poolweb #30): starts one real
  read-only impersonation session on staging — the only way to reach the
  one-time token phase whose `Copy token` feedback it verifies — then ENDS it
  through the Admins page. Two audit rows per run
  (`admin.impersonation_started` / `_ended`), a named reason on both, and a
  skip (never an end of somebody else's session) if a live one already exists.
- **Widened detail rendering** (`admin/detail-rich.spec.ts`, poolweb #31):
  writes nothing — it intercepts the real detail GET and widens the response
  body to the poolmobile #618 shape in flight, because no environment serves
  that shape yet.

CI wiring is out of scope for the first pass (poolmobile #594's AC).
