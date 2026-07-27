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
  AdminSignupsMetrics,
  AdminTransactionMetrics,
  AdminUserActionResponse,
  AdminUserDetailResponse,
  AdminUserListResponse,
  FunnelReport,
  MoneyEventCountsReport,
  PoolFunnelReport,
  PoolStatus,
  PoolVisibility,
  QaBroadcastBody,
  QaCustomNotificationBody,
  QaDepositBody,
  QaDepositResult,
  QaFanoutResult,
  QaFriendAcceptBody,
  QaFriendRequestBody,
  QaInspectResponse,
  QaJobRunResult,
  QaJobsResponse,
  QaLogExpenseBody,
  QaNotificationPreview,
  QaNotificationPreviewBody,
  QaNotificationSendBody,
  QaPoolInviteBody,
  QaPoolStatusBody,
  QaPoolStatusResult,
  QaSeedDemoBody,
  QaSeedDemoResult,
  QaSettlementActionBody,
  QaSettlementBody,
  QaStatus,
  QaSyntheticUsersBody,
  QaSyntheticUsersResult,
  QaWorkflowFriendRequestResult,
  QaWorkflowMemberResult,
  QaWorkflowOkResult,
  QaWorkflowSettlementResult,
  QaWorkflowTransactionResult,
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

// ─── QA console, STAGING-ONLY (poolmobile #132) ──────────────────────────────
// Every call is namespaced under `/qa/...`, which the existing catch-all proxy
// forwards to `${API}/api/v1/admin/qa/...` — NO proxy change was needed.
//
// A **404 from any of these means the console is disabled server-side** (the
// API gates it on a killswitch AND an environment assertion). Callers must
// treat 404 as "disabled", not as "missing record".

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const qaApi = {
  /** Authoritative enabled-check. Throws AdminApiError(404) when disabled. */
  status: () => request<QaStatus>('/qa/status'),

  notifications: {
    preview: (body: QaNotificationPreviewBody) =>
      post<QaNotificationPreview>('/qa/notifications/preview', body),
    send: (body: QaNotificationSendBody) => post<QaFanoutResult>('/qa/notifications/send', body),
    custom: (body: QaCustomNotificationBody) =>
      post<QaFanoutResult>('/qa/notifications/custom', body),
    /** 409 when the audience exceeds the server's broadcast cap. */
    broadcast: (body: QaBroadcastBody) => post<QaFanoutResult>('/qa/notifications/broadcast', body),
  },

  jobs: {
    list: () => request<QaJobsResponse>('/qa/jobs'),
    /** 504 means the job is STILL RUNNING server-side, not that it failed. */
    run: (jobName: string) => post<QaJobRunResult>(`/qa/jobs/${encodeURIComponent(jobName)}/run`),
  },

  workflows: {
    poolInvite: (body: QaPoolInviteBody) => post<QaWorkflowMemberResult>('/qa/workflows/pool-invite', body),
    friendRequest: (body: QaFriendRequestBody) =>
      post<QaWorkflowFriendRequestResult>('/qa/workflows/friend-request', body),
    friendAccept: (body: QaFriendAcceptBody) =>
      post<QaWorkflowOkResult>('/qa/workflows/friend-accept', body),
    logExpense: (body: QaLogExpenseBody) =>
      post<QaWorkflowTransactionResult>('/qa/workflows/log-expense', body),
    /** A PENDING settlement requires `actingUserId === fromUserId` (the debtor). */
    settlement: (body: QaSettlementBody) =>
      post<QaWorkflowSettlementResult>('/qa/workflows/settlement', body),
    confirmSettlement: (id: string, body: QaSettlementActionBody) =>
      post<QaWorkflowSettlementResult>(
        `/qa/workflows/settlement/${encodeURIComponent(id)}/confirm`,
        body,
      ),
    /** 409 when the settlement was already confirmed/rejected (a race). */
    rejectSettlement: (id: string, body: QaSettlementActionBody) =>
      post<QaWorkflowSettlementResult>(
        `/qa/workflows/settlement/${encodeURIComponent(id)}/reject`,
        body,
      ),
  },

  state: {
    syntheticUsers: (body: QaSyntheticUsersBody) =>
      post<QaSyntheticUsersResult>('/qa/state/synthetic-users', body),
    deposit: (body: QaDepositBody) => post<QaDepositResult>('/qa/state/deposit', body),
    poolStatus: (body: QaPoolStatusBody) => post<QaPoolStatusResult>('/qa/state/pool-status', body),
    /** DESTRUCTIVE — wipes all non-admin staging data before reseeding. */
    seedDemo: (body: QaSeedDemoBody) => post<QaSeedDemoResult>('/qa/state/seed-demo', body),
  },

  inspect: {
    user: (userId: string) =>
      request<QaInspectResponse>(`/qa/inspect/users/${encodeURIComponent(userId)}`),
  },
};

/** Client-side logout: clears cookies server-side, then bounces to login. */
export async function adminLogout(): Promise<void> {
  try {
    await fetch(`${PROXY_BASE}/auth/logout`, { method: 'POST' });
  } finally {
    if (typeof window !== 'undefined') window.location.href = '/admin/login';
  }
}
