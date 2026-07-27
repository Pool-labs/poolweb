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

// ─── QA console, STAGING-ONLY (source: poolmobile issue #132, /admin/qa/*) ────

/**
 * DTOs for the staging QA console.
 *
 * SOURCE OF TRUTH (poolmobile): the `/api/v1/admin/qa/*` routes + their shared
 * Zod schemas. These were written against the issue-#132 contract, so anything
 * tagged `ASSUMED` below is a guess that must be reconciled with the server.
 * Everything the console sends/receives is isolated in this block and in
 * `qaApi` (adminApi.ts) so reconciling stays a small diff.
 *
 * The console is invisible off-staging: `GET /qa/status` returns **404 whenever
 * the console is disabled server-side**, which the client treats as "disabled".
 */

/** Max recipients per fan-out call (server-enforced; mirrored client-side). */
export const QA_MAX_RECIPIENTS = 25;

/** Max synthetic users creatable per call. */
export const QA_MAX_SYNTHETIC_USERS = 25;

/** Server cap on a broadcast audience — over this the API answers 409. */
export const QA_BROADCAST_CAP = 200;

/** Exact phrase a broadcast body must carry (from the #132 contract). */
export const QA_BROADCAST_CONFIRMATION = 'SEND TO ALL STAGING USERS';

/** ASSUMED — the #132 contract says `{ confirmation }` but not its value. */
export const QA_SEED_DEMO_CONFIRMATION = 'WIPE AND SEED STAGING';

/**
 * ASSUMED delivery-channel wire values for the custom/broadcast notification
 * forms. The contract names a `channel` field without enumerating it.
 */
export enum QaNotificationChannel {
  Push = 'PUSH',
  InApp = 'IN_APP',
  Both = 'BOTH',
}

/** GET /qa/status — inner `data`. A 404 instead means "console disabled". */
export interface QaStatus {
  enabled: boolean;
  /** Server-reported environment, e.g. "staging". */
  environment: string;
  /** Runnable scheduled-job names. */
  jobs: string[];
  /** Notification-type keys accepted by preview/send/broadcast. */
  notificationTypes: string[];
}

// Notifications ---------------------------------------------------------------

export interface QaNotificationPreviewBody {
  type: string;
  userId: string;
  context?: Record<string, unknown>;
}

/** POST /qa/notifications/preview — inner `data`. */
export interface QaNotificationPreview {
  title: string;
  body: string;
  pushTitle: string;
  pushBody: string;
  /** False when the recipient has no live push token / has opted out. */
  willPush: boolean;
}

export interface QaNotificationSendBody {
  type: string;
  userIds: string[];
  context?: Record<string, unknown>;
}

export interface QaCustomNotificationBody {
  userIds: string[];
  title: string;
  body: string;
  pushTitle?: string;
  pushBody?: string;
  channel: QaNotificationChannel;
}

/** Either a templated type OR custom copy, plus the typed confirmation. */
export type QaBroadcastBody = { confirmation: string } & (
  | { type: string; context?: Record<string, unknown> }
  | {
      title: string;
      body: string;
      pushTitle?: string;
      pushBody?: string;
      channel: QaNotificationChannel;
    }
);

/** One recipient a fan-out could not reach. */
export interface QaFanoutFailure {
  userId: string;
  reason: string;
}

/**
 * Shared result of every notification fan-out (send / custom / broadcast).
 * Partial success is the NORMAL case — `delivered < targeted` with per-user
 * reasons in `failed` is not an error.
 */
export interface QaFanoutResult {
  targeted: number;
  delivered: number;
  failed: QaFanoutFailure[];
}

// Jobs ------------------------------------------------------------------------

export interface QaJob {
  name: string;
  description: string;
  /** ISO-8601, or null when never run. */
  lastRunAt: string | null;
}

/** GET /qa/jobs — inner `data`. */
export interface QaJobsResponse {
  jobs: QaJob[];
}

/** POST /qa/jobs/:jobName/run — inner `data`. 504 = still running server-side. */
export interface QaJobRunResult {
  job: string;
  deletedCount: number;
  durationMs: number;
}

// Workflows -------------------------------------------------------------------

export interface QaPoolInviteBody {
  poolId: string;
  actingUserId: string;
  /** Email or username of the invitee. */
  identifier: string;
}

export interface QaFriendRequestBody {
  requesterId: string;
  identifier: string;
}

export interface QaFriendAcceptBody {
  responderId: string;
  friendshipId: string;
}

/**
 * ASSUMED optional fields: the contract spells this `{ actingUserId, poolId,
 * amountCents, ... }`. `merchantName`/`note` mirror the ledger transaction row.
 */
export interface QaLogExpenseBody {
  actingUserId: string;
  poolId: string;
  amountCents: number;
  merchantName?: string;
  note?: string;
}

export interface QaSettlementBody {
  actingUserId: string;
  poolId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export interface QaSettlementActionBody {
  actingUserId: string;
}

/**
 * Workflow results are echoed back as whole records whose exact field sets the
 * contract does not pin down. Only the fields the console needs are declared;
 * the rest is rendered generically, so extra/renamed fields never break a page.
 */
export interface QaWorkflowMemberResult {
  member: Record<string, unknown>;
}

export interface QaWorkflowFriendRequestResult {
  friendshipId: string;
}

export interface QaWorkflowOkResult {
  ok: boolean;
}

export interface QaWorkflowTransactionResult {
  transaction: Record<string, unknown> & { id?: string; amountCents?: number };
}

export interface QaWorkflowSettlementResult {
  settlement: Record<string, unknown> & {
    id?: string;
    status?: string;
    amountCents?: number;
  };
}

// State setup -----------------------------------------------------------------

export interface QaSyntheticUsersBody {
  count: number;
}

export interface QaSyntheticUser {
  id: string;
  email: string;
}

export interface QaSyntheticUsersResult {
  users: QaSyntheticUser[];
}

export interface QaDepositBody {
  poolId: string;
  userId: string;
  amountCents: number;
}

export interface QaDepositResult {
  pool: Record<string, unknown> & { id?: string; balanceCents?: number };
  deposit: Record<string, unknown> & { id?: string; amountCents?: number };
}

export interface QaPoolStatusBody {
  poolId: string;
  actingUserId: string;
  status: PoolStatus;
}

export interface QaPoolStatusResult {
  pool: Record<string, unknown> & { id?: string; status?: string };
}

export interface QaSeedDemoBody {
  confirmation: string;
}

/** Counts may come back as a total or a per-entity breakdown — handle both. */
export type QaSeedCounts = number | Record<string, number>;

export interface QaSeedDemoResult {
  wiped: QaSeedCounts;
  created: QaSeedCounts;
}

// Inspect ---------------------------------------------------------------------

/** A push token as returned by the console — ALREADY masked server-side. */
export interface QaPushTokenSummary {
  id: string;
  platform: string;
  deviceName: string | null;
  lastUsedAt: string | null;
  /** Null when still enabled. */
  disabledAt: string | null;
  /** Truncated/masked — the full token is never sent to the client. */
  maskedToken: string;
}

/**
 * GET /qa/inspect/users/:userId — inner `data`.
 *
 * Every field is optional and loosely typed on purpose: this is a debugging
 * dump whose shape the API may extend, and the console renders it generically
 * (money keys ending in `Cents` are formatted, `*At` keys as timestamps).
 */
export interface QaInspectResponse {
  user?: Record<string, unknown> | null;
  memberships?: Array<Record<string, unknown>> | null;
  balances?: unknown;
  pointBalance?: number | null;
  streak?: unknown;
  featureFlags?: Record<string, unknown> | null;
  notificationPreferences?: Record<string, unknown> | null;
  pushTokens?: QaPushTokenSummary[] | null;
}
