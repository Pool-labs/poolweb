/**
 * Platform-admin REST DTOs — hand-copied from the Pool API's shared package.
 *
 * SOURCE OF TRUTH (poolmobile, mirrored at the current commit — keep in sync if
 * the API contract changes; @pool/shared is not installable in this repo):
 *   - packages/shared/src/types/admin-metrics.types.ts   (#80 metrics)
 *   - packages/shared/src/types/analytics.types.ts       (#81 funnels / money events)
 *   - packages/shared/src/types/admin.types.ts           (#82 ledger + #83 user/pool mgmt)
 *   - packages/shared/src/types/pool.types.ts            (PoolStatus)
 *   - packages/shared/src/types/user.types.ts            (UserFeatureFlags)
 *   - packages/shared/src/validation/pool.schema.ts      (PoolVisibility)
 *   - packages/shared/src/validation/settlement.schema.ts (BalanceEntry / SettlementMethod / SettlementStatus)
 *
 * Only the shapes the /admin web surface actually renders are copied here. All
 * money figures are INTEGER CENTS. Every API response is enveloped
 * `{ success, data }`; these types describe the inner `data`.
 */

// ─── Enums (wire values must match the API's Prisma enums exactly) ────────────

export enum PoolStatus {
  Active = 'ACTIVE',
  Closed = 'CLOSED',
  Archived = 'ARCHIVED',
}

export enum PoolVisibility {
  Private = 'PRIVATE',
  Public = 'PUBLIC',
}

export enum SettlementMethod {
  Venmo = 'VENMO',
  Cashapp = 'CASHAPP',
  Paypal = 'PAYPAL',
  Zelle = 'ZELLE',
  Cash = 'CASH',
  Other = 'OTHER',
}

export enum SettlementStatus {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Rejected = 'REJECTED',
}

/** Typed feature-flag set (source: user.types.ts). */
export interface UserFeatureFlags {
  experimental: boolean;
}

/** The single toggleable feature-flag key (source: user.types.ts). */
export enum UserFeatureFlagKey {
  Experimental = 'experimental',
}

// ─── Auth (source: server/src/services/auth.service.ts verifyOtp result) ─────

/** Inner `data` of POST /api/v1/auth/verify-otp. */
export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  isNewUser: boolean;
  deviceToken: string;
}

// ─── Admin allowlist (source: admin.types.ts AdminAllowlistEntrySummary) ─────

/**
 * One admin-allowlist entry, as returned by GET /admin/allowlist. The DB-backed
 * allowlist is the source of truth for who may become a platform admin: adding
 * an email lets that person request an admin code and become an admin on first
 * login; removing it revokes access.
 *
 * Mirrors `AdminAllowlistEntrySummary` in
 * packages/shared/src/types/admin.types.ts (keep in sync).
 */
export interface AdminAllowlistEntry {
  /** Normalized (lowercased) email. */
  email: string;
  /** User id of the admin who added it; null = system seed (migration). */
  addedById: string | null;
  /** ISO-8601 timestamp. */
  createdAt: string;
  /**
   * True when a non-deleted user with this email currently holds an ACTIVE
   * platform_admins row — i.e. the entry has materialized into an active admin
   * (logged in), vs. invited-but-not-yet-logged-in.
   */
  isActiveAdmin: boolean;
}

/** GET /admin/allowlist — inner `data`. */
export interface AdminAllowlistListResponse {
  entries: AdminAllowlistEntry[];
}

/** POST /admin/allowlist — inner `data`. */
export interface AdminAllowlistAddResponse {
  entry: AdminAllowlistEntry;
}

/** DELETE /admin/allowlist/:email — inner `data`. */
export interface AdminAllowlistRemoveResponse {
  /** The removed (normalized) email. */
  email: string;
  /** True when an active platform_admins row was revoked in the same tx. */
  revokedAdmin: boolean;
}

// ─── #80 metrics (source: admin-metrics.types.ts) ────────────────────────────

export interface MetricBucket {
  bucket: string;
  count: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface AdminActiveUsersMetrics {
  asOf: string;
  dau: number;
  wau: number;
  mau: number;
  lastSeenDistribution: MetricBucket[];
}

export interface AdminSignupSeriesPoint {
  date: string;
  signups: number;
  cumulative: number;
}

export interface AdminSignupsMetrics {
  window: { days: number; since: string };
  totalInWindow: number;
  totalAllTime: number;
  series: AdminSignupSeriesPoint[];
}

export interface AdminPoolMetrics {
  total: number;
  byType: Record<string, number>;
  byVisibility: Record<string, number>;
  byStatus: Record<string, number>;
  newPoolsSeries: TimeSeriesPoint[];
}

export interface AdminTransactionMetrics {
  total: number;
  byStatus: Record<string, number>;
  series: TimeSeriesPoint[];
}

export interface AdminEngagementMetrics {
  points: {
    basis: 'pointBalance';
    buckets: MetricBucket[];
    totalUsers: number;
  };
  streak: {
    current: MetricBucket[];
    longestMax: number;
  };
}

// ─── #81 funnels / money-event counts (source: analytics.types.ts) ───────────

export interface FunnelStageCount {
  actors: number;
  events: number;
}

export interface FunnelStageTotal {
  name: string;
  actors: number;
  events: number;
}

export interface FunnelDayBucket {
  date: string;
  stages: Record<string, FunnelStageCount>;
}

export interface FunnelReport {
  since: string;
  windowDays: number;
  stageOrder: string[];
  buckets: FunnelDayBucket[];
  totals: FunnelStageTotal[];
  conversionRates: Record<string, number>;
}

export interface PoolFunnelReport {
  create: FunnelReport;
  join: FunnelReport;
}

export interface MoneyEventDayBucket {
  date: string;
  counts: Record<string, number>;
}

export interface MoneyEventCountsReport {
  since: string;
  windowDays: number;
  events: string[];
  buckets: MoneyEventDayBucket[];
  totals: Record<string, number>;
}

// ─── #83 user/pool management (source: admin.types.ts) ────────────────────────

export interface AdminUserSummary {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  isSuspended: boolean;
  deletedAt: string | null;
  createdAt: string;
}

export interface AdminUserMembershipSummary {
  owner: number;
  admin: number;
  member: number;
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  isSuspended: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  featureFlags: UserFeatureFlags;
  isPlatformAdmin: boolean;
  poolCount: number;
  membership: AdminUserMembershipSummary;
}

export interface AdminPoolSummary {
  id: string;
  name: string;
  status: PoolStatus;
  visibility: PoolVisibility;
  isSuspended: boolean;
  deletedAt: string | null;
  balanceCents: number;
  memberCount: number;
  creatorId: string;
  createdAt: string;
}

export interface AdminPoolCreatorSummary {
  id: string;
  email: string | null;
  displayName: string | null;
}

export interface AdminPoolDetail {
  id: string;
  name: string;
  status: PoolStatus;
  visibility: PoolVisibility;
  isSuspended: boolean;
  deletedAt: string | null;
  balanceCents: number;
  memberCount: number;
  creator: AdminPoolCreatorSummary;
  createdAt: string;
  updatedAt: string;
}

// Per-endpoint response shapes (the `data` inside `{ success, data }`).

export interface AdminUserListResponse {
  users: AdminUserSummary[];
  limit: number;
  offset: number;
  total: number;
}

export interface AdminUserDetailResponse {
  user: AdminUserDetail;
}

export interface AdminPoolListResponse {
  pools: AdminPoolSummary[];
  limit: number;
  offset: number;
  total: number;
}

export interface AdminPoolDetailResponse {
  pool: AdminPoolDetail;
}

export interface AdminFeatureFlagUpdateResponse {
  userId: string;
  flags: UserFeatureFlags;
}

export interface AdminUserActionResponse {
  user: AdminUserSummary;
}

export interface AdminPoolActionResponse {
  pool: AdminPoolSummary;
}

// ─── #82 ledger visibility, READ-ONLY (source: admin.types.ts + services) ─────

/** Per-member net owe/owed edge (source: settlement.schema.ts BalanceEntry). */
export interface BalanceEntry {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export interface AdminDepositEntry {
  id: string;
  userId: string;
  amountCents: number;
  /** DepositStatus wire value (e.g. COMPLETED / PENDING / FAILED / REFUNDED). */
  status: string;
  createdAt: string;
}

export interface AdminPoolLedgerSummary {
  poolId: string;
  poolName: string;
  /** PoolStatus wire value. */
  status: string;
  /** Authoritative stored balance (Pool.balanceCents) — not recomputed. */
  cardBalanceCents: number;
  totalDepositedCents: number;
  totalSpentCents: number;
  memberBalances: BalanceEntry[];
  counts: {
    deposits: number;
    transactions: number;
    settlements: number;
  };
}

/**
 * Ledger transaction row. The admin-ledger service returns Prisma rows with a
 * nested user include; only the fields the web view renders are typed here.
 */
export interface AdminLedgerTransaction {
  id: string;
  poolId: string;
  userId: string;
  amountCents: number;
  merchantName: string | null;
  status: string;
  note: string | null;
  createdAt: string;
  user?: { id: string; displayName: string | null } | null;
}

/** Ledger settlement row (the #38 lifecycle scalars the web view renders). */
export interface AdminLedgerSettlement {
  id: string;
  poolId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  method: SettlementMethod;
  status: SettlementStatus;
  initiatedByUserId: string;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminLedgerDepositsResponse {
  deposits: AdminDepositEntry[];
  nextCursor: string | null;
}

export interface AdminLedgerTransactionsResponse {
  transactions: AdminLedgerTransaction[];
  nextCursor: string | null;
}

export interface AdminLedgerBalancesResponse {
  memberBalances: BalanceEntry[];
}

export interface AdminLedgerSettlementsResponse {
  settlements: AdminLedgerSettlement[];
  nextCursor: string | null;
}
