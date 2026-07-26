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
  error?: string;
  message?: string;
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
    throw new AdminApiError(body.error || body.message || `Request failed (${res.status})`, res.status);
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

/** Client-side logout: clears cookies server-side, then bounces to login. */
export async function adminLogout(): Promise<void> {
  try {
    await fetch(`${PROXY_BASE}/auth/logout`, { method: 'POST' });
  } finally {
    if (typeof window !== 'undefined') window.location.href = '/admin/login';
  }
}
