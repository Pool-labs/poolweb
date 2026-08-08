'use client';

/**
 * Client-side typed API for the platform-admin surface.
 *
 * Every call goes to the SAME-ORIGIN Next proxy at `/admin/api/<path>` — there
 * is NO API base URL and NO Bearer token in client JS (the httpOnly cookies +
 * server proxy handle auth). Responses are enveloped `{ success, data }`; these
 * helpers unwrap and return `.data`, typed to the copied DTOs.
 *
 * A 401 (expired/absent session, refresh already failed server-side) redirects
 * the browser to /admin/login.
 */

import type {
  AdminAllowlistAddResponse,
  AdminAllowlistListResponse,
  AdminAllowlistRemoveResponse,
  AdminActiveUsersMetrics,
  AdminEngagementMetrics,
  AdminFeatureFlagUpdateResponse,
  AdminLedgerBalancesResponse,
  AdminLedgerDepositsResponse,
  AdminLedgerSettlementsResponse,
  AdminLedgerTransactionsResponse,
  AdminPoolActionResponse,
  AdminPoolDetailResponse,
  AdminPoolListResponse,
  AdminPoolLedgerSummary,
  AdminPoolMetrics,
  AdminReportDetail,
  AdminReportListResponse,
  AdminReviewReportInput,
  AdminSignupsMetrics,
  AdminTransactionMetrics,
  AdminUserActionResponse,
  AdminUserDetailResponse,
  AdminUserListResponse,
  FunnelReport,
  AdminAlertState,
  MoneyEventCountsReport,
  ObservabilityErrorsFeed,
  ObservabilityErrorsQuery,
  PoolFunnelReport,
  PoolStatus,
  PoolVisibility,
  ReportStatus,
  QaBroadcastBody,
  QaConfirmationBody,
  QaDepositBody,
  QaDepositResponse,
  QaJobRunBody,
  QaJobRunResponse,
  QaNotificationPreviewResponse,
  QaNotificationSendResponse,
  QaNotificationTriggerBody,
  QaPoolStatusBody,
  QaPoolStatusResponse,
  QaPushSendBody,
  QaPushSendResponse,
  QaResetAccountBody,
  QaResetAccountResponse,
  QaSeedResponse,
  QaStatus,
  QaSyntheticUsersBody,
  QaSyntheticUsersResponse,
  QaUserInspection,
  QaWorkflowClosePoolBody,
  QaWorkflowFriendRequestBody,
  QaWorkflowLogExpenseBody,
  QaWorkflowPoolInviteBody,
  QaWorkflowResponse,
  QaWorkflowSettlementBody,
  UserFeatureFlagKey,
} from './types';

const PROXY_BASE = '/admin/api';

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  /** The API error middleware sends an OBJECT here; the proxy sends a string. */
  error?: string | { message?: string; statusCode?: number; requestId?: string };
  message?: string;
}

/**
 * Pull a plain string out of whatever error shape came back.
 *
 * The Pool API's error middleware returns `{ error: { message, statusCode,
 * requestId } }` (an OBJECT), while the Next proxy returns a string `error`.
 * `AdminApiError.message` must ALWAYS be a string — rendering an object as a
 * React child crashes the page (fixed in dea072b; this keeps it fixed for the
 * object-shaped case too, which QA-console errors like the 409 broadcast cap
 * and the 504 job timeout rely on).
 *
 * Client-side twin of `apiErrorMessage` in serverApi.ts, duplicated on purpose:
 * serverApi is server-only and must not be pulled into a client bundle.
 */
function errorMessage(body: Envelope<unknown>, fallback: string): string {
  if (typeof body.error === 'string' && body.error) return body.error;
  if (body.error && typeof body.error === 'object' && typeof body.error.message === 'string') {
    return body.error.message;
  }
  if (typeof body.message === 'string' && body.message) return body.message;
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/admin/login';
    throw new AdminApiError('Session expired', 401);
  }

  const body = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || body.success === false) {
    throw new AdminApiError(errorMessage(body, `Request failed (${res.status})`), res.status);
  }
  return body.data as T;
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ─── Metrics (#80) ────────────────────────────────────────────────────────────

export const metricsApi = {
  activeUsers: (days?: number) =>
    request<AdminActiveUsersMetrics>(`/metrics/active-users${query({ days })}`),
  signups: (days?: number) =>
    request<AdminSignupsMetrics>(`/metrics/signups${query({ days })}`),
  pools: (days?: number) => request<AdminPoolMetrics>(`/metrics/pools${query({ days })}`),
  transactions: (days?: number) =>
    request<AdminTransactionMetrics>(`/metrics/transactions${query({ days })}`),
  engagement: (days?: number) =>
    request<AdminEngagementMetrics>(`/metrics/engagement${query({ days })}`),
};

// ─── Funnels / money events (#81) ─────────────────────────────────────────────

export const funnelsApi = {
  auth: (days?: number) =>
    request<FunnelReport>(`/analytics/funnels/auth${query({ days })}`),
  pool: (days?: number) =>
    request<PoolFunnelReport>(`/analytics/funnels/pool${query({ days })}`),
  discover: (days?: number) =>
    request<FunnelReport>(`/analytics/funnels/discover${query({ days })}`),
  moneyEvents: (days?: number) =>
    request<MoneyEventCountsReport>(`/analytics/money-events${query({ days })}`),
};

// ─── User management (#83) ────────────────────────────────────────────────────

export interface UserSearchParams {
  q?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export const usersApi = {
  list: (params: UserSearchParams = {}) =>
    request<AdminUserListResponse>(`/users${query({ ...params })}`),
  get: (id: string) => request<AdminUserDetailResponse>(`/users/${id}`),
  setFeatureFlag: (id: string, key: UserFeatureFlagKey, value: boolean) =>
    request<AdminFeatureFlagUpdateResponse>(`/users/${id}/feature-flags`, {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    }),
  suspend: (id: string, reason?: string) =>
    request<AdminUserActionResponse>(`/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  restore: (id: string) =>
    request<AdminUserActionResponse>(`/users/${id}/restore`, { method: 'POST' }),
};

// ─── Pool management (#83) + ledger (#82) ─────────────────────────────────────

export interface PoolSearchParams {
  q?: string;
  status?: PoolStatus;
  visibility?: PoolVisibility;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export const poolsApi = {
  list: (params: PoolSearchParams = {}) =>
    request<AdminPoolListResponse>(`/pools${query({ ...params })}`),
  get: (id: string) => request<AdminPoolDetailResponse>(`/pools/${id}`),
  suspend: (id: string, opts: { reason?: string; override?: boolean } = {}) =>
    request<AdminPoolActionResponse>(`/pools/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
  restore: (id: string) =>
    request<AdminPoolActionResponse>(`/pools/${id}/restore`, { method: 'POST' }),
  ledger: (id: string) => request<AdminPoolLedgerSummary>(`/pools/${id}/ledger`),
  ledgerDeposits: (id: string, cursor?: string, limit?: number) =>
    request<AdminLedgerDepositsResponse>(
      `/pools/${id}/ledger/deposits${query({ cursor, limit })}`,
    ),
  ledgerTransactions: (id: string, cursor?: string, limit?: number) =>
    request<AdminLedgerTransactionsResponse>(
      `/pools/${id}/ledger/transactions${query({ cursor, limit })}`,
    ),
  ledgerBalances: (id: string) =>
    request<AdminLedgerBalancesResponse>(`/pools/${id}/ledger/balances`),
  ledgerSettlements: (id: string, cursor?: string, limit?: number) =>
    request<AdminLedgerSettlementsResponse>(
      `/pools/${id}/ledger/settlements${query({ cursor, limit })}`,
    ),
};

// ─── Admin allowlist (the "Admins" page) ─────────────────────────────────────
// The DB-backed allowlist that controls who may log in: add an email → that
// person can request an admin code and becomes an admin on first login; remove
// → their access is revoked. All calls go through the same-origin proxy, which
// injects the Bearer and forwards `allowlist/*` to `${API}/api/v1/admin/...`.

export const adminsApi = {
  list: () => request<AdminAllowlistListResponse>('/allowlist'),
  add: (email: string) =>
    request<AdminAllowlistAddResponse>('/allowlist', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  remove: (email: string) =>
    request<AdminAllowlistRemoveResponse>(
      `/allowlist/${encodeURIComponent(email)}`,
      { method: 'DELETE' },
    ),
};

// ─── Errors / Health (#116) ──────────────────────────────────────────────────
// READ-ONLY. ONE endpoint — `GET /admin/observability/errors` — which returns
// BOTH sources (CloudWatch + Sentry) in a single fail-open payload; there is
// deliberately no separate `/summary` or `/sentry` route to call.
//
// The path is static, and every bound is re-validated server-side by Zod, so an
// out-of-range filter degrades to a 400 rather than an unbounded log scan. The
// endpoint is identity-gated (JWT + platform-admin) like every #80–#83 call, so
// the proxy's Bearer injection is all that is needed here.

export const observabilityApi = {
  errors: (params: ObservabilityErrorsQuery = {}) =>
    request<ObservabilityErrorsFeed>(`/observability/errors${query({ ...params })}`),

  /**
   * Proactive alerting state (#190) — the persistent banner's trigger plus the
   * per-alarm summaries and the email posture.
   *
   * Takes NO parameters, deliberately: the watched alarm set is a fixed
   * reviewed list on the server and no caller input may widen it. Like every
   * call here it rides the same-origin env-aware proxy, so it automatically
   * reports the CURRENTLY SELECTED environment (#112) — the banner follows the
   * toggle with no work of its own.
   */
  alerts: () => request<AdminAlertState>('/observability/alerts'),
};

// ─── Moderation queue (#158) ─────────────────────────────────────────────────
// The store-review gate's "demonstrable action on reports". Identity-gated like
// every #80–#84 call, so the proxy's Bearer injection is all that is needed.
//
// The queue is served OLDEST-FIRST by the API and is deliberately NOT re-sorted
// here: it is a work queue with a published SLA, not a feed, so the row closest
// to breaching sits at the top. Pagination is a cursor (`nextCursor`) over
// (createdAt ASC, id ASC) — "load more", never a page number.

export interface ReportListParams {
  status?: ReportStatus;
  cursor?: string;
  limit?: number;
}

export const reportsApi = {
  list: (params: ReportListParams = {}) =>
    request<AdminReportListResponse>(`/reports${query({ ...params })}`),
  get: (id: string) => request<AdminReportDetail>(`/reports/${encodeURIComponent(id)}`),
  /**
   * Record the decision. `status` is required (a review that does not move the
   * report is not a review); `action` defaults to `None` server-side.
   *
   * `ReportAction.ContentRemoved` is the ONLY action this call PERFORMS — it
   * redacts the reported message (`Message.deletedAt`, founder decision D9) in
   * the same transaction as the review, and 400s when the target is not a
   * MESSAGE. `UserSuspended` / `UserWarned` are RECORDED only: suspension is
   * carried out through `usersApi.suspend` on the user's own page, which the UI
   * links to rather than duplicating here.
   */
  review: (id: string, body: AdminReviewReportInput) =>
    request<AdminReportDetail>(`/reports/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── QA console, STAGING-ONLY (poolmobile #132) ──────────────────────────────
// Every call is namespaced under `/qa/...`, which the existing catch-all proxy
// forwards to `${API}/api/v1/admin/qa/...` — NO proxy change was needed.
//
// A **404 from any of these means the console is disabled server-side** (the
// API gates it on a killswitch AND an environment allowlist, and deliberately
// exposes no always-mounted capability endpoint). Callers must treat 404 as
// "disabled", never as "missing record".
//
// ALL PATHS ARE STATIC — ids travel in the body or the query string, so nothing
// here interpolates a user-supplied value into a URL path.

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const qaApi = {
  /** Authoritative enabled-check. Throws AdminApiError(404) when disabled. */
  status: () => request<QaStatus>('/qa/status'),

  notifications: {
    /** Renders the real builder's output — one preview per recipient. */
    preview: (body: QaNotificationTriggerBody) =>
      post<QaNotificationPreviewResponse>('/qa/notifications/preview', body),
    /** Same body as preview; hands the identical payload to `notify()`. */
    send: (body: QaNotificationTriggerBody) =>
      post<QaNotificationSendResponse>('/qa/notifications/send', body),
    /** Arbitrary copy to explicitly selected users. Copy must be money-free. */
    push: (body: QaPushSendBody) => post<QaPushSendResponse>('/qa/notifications/push', body),
    /** 409 when the RESOLVED audience exceeds the broadcast cap (never truncated). */
    broadcast: (body: QaBroadcastBody) =>
      post<QaPushSendResponse>('/qa/notifications/broadcast', body),
  },

  jobs: {
    /** The job is an enum member in the BODY — there is no `GET /qa/jobs`; the
     *  runnable list comes from `GET /qa/status` → `jobs[]`. */
    run: (body: QaJobRunBody) => post<QaJobRunResponse>('/qa/jobs/run', body),
  },

  workflows: {
    poolInvite: (body: QaWorkflowPoolInviteBody) =>
      post<QaWorkflowResponse>('/qa/workflows/pool-invite', body),
    friendRequest: (body: QaWorkflowFriendRequestBody) =>
      post<QaWorkflowResponse>('/qa/workflows/friend-request', body),
    logExpense: (body: QaWorkflowLogExpenseBody) =>
      post<QaWorkflowResponse>('/qa/workflows/log-expense', body),
    settlement: (body: QaWorkflowSettlementBody) =>
      post<QaWorkflowResponse>('/qa/workflows/settlement', body),
    closePool: (body: QaWorkflowClosePoolBody) =>
      post<QaWorkflowResponse>('/qa/workflows/close-pool', body),
  },

  state: {
    syntheticUsers: (body: QaSyntheticUsersBody) =>
      post<QaSyntheticUsersResponse>('/qa/state/synthetic-users', body),
    /** DESTRUCTIVE — wipes first, then reseeds. */
    seedDemo: (body: QaConfirmationBody) => post<QaSeedResponse>('/qa/state/seed-demo', body),
    /** DESTRUCTIVE — wipes demo data, preserving admin/allowlisted accounts. */
    wipeDemo: (body: QaConfirmationBody) => post<QaSeedResponse>('/qa/state/wipe-demo', body),
    /** 201. Funds a pool through the real `payment.processDeposit`. */
    deposit: (body: QaDepositBody) => post<QaDepositResponse>('/qa/state/deposit', body),
    /**
     * DESTRUCTIVE and NOT ATOMIC — resolves 200 even when individual `steps`
     * failed, so callers MUST render the per-step outcomes. 409 for a platform
     * admin, 404 for an unknown user.
     */
    resetAccount: (body: QaResetAccountBody) =>
      post<QaResetAccountResponse>('/qa/state/reset-account', body),
    /** The one non-delegating endpoint — see QaPoolStatusResponse.warning. */
    poolStatus: (body: QaPoolStatusBody) =>
      post<QaPoolStatusResponse>('/qa/state/pool-status', body),
  },

  inspect: {
    /** userId travels as a QUERY param — the path is static. */
    user: (userId: string) => request<QaUserInspection>(`/qa/inspect/user${query({ userId })}`),
  },
};

/**
 * Client-side logout: clears cookies server-side, then bounces to login.
 *
 * Scoped to the SELECTED environment by default (#112) — the server reads the
 * env cookie and ends only that session, leaving any other environment signed
 * in. Pass `'all'` to end every environment's session at once.
 */
export async function adminLogout(scope: 'current' | 'all' = 'current'): Promise<void> {
  try {
    await fetch(`${PROXY_BASE}/auth/logout${scope === 'all' ? '?scope=all' : ''}`, {
      method: 'POST',
    });
  } finally {
    if (typeof window !== 'undefined') window.location.href = '/admin/login';
  }
}
