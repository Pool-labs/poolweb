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


// ─── QA console, STAGING-ONLY (poolmobile #132) ───────────────────────────────

/**
 * DTOs for the staging QA console.
 *
 * SOURCE OF TRUTH (poolmobile, mirrored at the shipped contract):
 *   - packages/shared/src/types/qa.types.ts        (enums + every response)
 *   - packages/shared/src/validation/qa.schema.ts  (every request body)
 *   - packages/shared/src/constants/qa.constants.ts (limits, phrases, copy rules)
 *   - packages/shared/src/types/pool.types.ts      (ExpenseCategory)
 *   - packages/shared/src/validation/settlement.schema.ts (SettlementMethod)
 *   - packages/shared/src/types/notification.types.ts (PushTokenSummary, prefs)
 *
 * ALL PATHS ARE STATIC — ids travel in the body or the query string, never in
 * the path. Every recipient/target array is UUIDs, min 1, max 25.
 *
 * The console is invisible off-staging: every route (including `/qa/status`)
 * returns **404 whenever the console is disabled server-side**, because there
 * is deliberately no always-mounted capability endpoint to leak that QA tools
 * exist. The client treats any 404 as "disabled".
 */

/** Client-side fallbacks; the live values come from `QaStatus.limits`. */
export const QA_DEFAULT_LIMITS = {
  maxSelectedUsers: 25,
  maxBroadcastRecipients: 200,
  maxSyntheticUsers: 25,
} as const;

/** Exact literals the operator must type (source: QA_TOOLS in qa.constants). */
export const QA_BROADCAST_CONFIRMATION = 'SEND TO ALL STAGING USERS';
export const QA_SEED_CONFIRMATION = 'RESEED STAGING';
export const QA_WIPE_CONFIRMATION = 'WIPE STAGING DATA';

/** Push copy budgets (source: PUSH_LIMITS in notification.constants). */
export const QA_PUSH_TITLE_MAX_CHARS = 100;
export const QA_PUSH_BODY_MAX_CHARS = 240;

/**
 * MONEY-FREE PUSH COPY — mirrors `MONEY_LIKE_PATTERNS` in qa.constants.
 *
 * The push/broadcast endpoints are the one place a human types free text that
 * lands on a lock screen, so the API rejects currency symbols, decimal amounts
 * and `@handles` with a 400. Mirrored here purely to fail EARLY with the real
 * reason instead of a bare validation error — the server check is the one that
 * counts, and this is a heuristic, never a proof.
 */
export const QA_MONEY_LIKE_PATTERNS: readonly RegExp[] = [
  /[$£€¥₹¢]/,
  /\d[\d,]*\.\d/,
  /@/,
];

export const QA_MONEY_FREE_COPY_MESSAGE =
  'Push copy renders on a locked phone: no currency symbols, decimal amounts, or @handles';

/** Runnable scheduled jobs (source: QaJobName). */
export enum QaJobName {
  PurgeAnalytics = 'purge_analytics',
  PurgeAudit = 'purge_audit',
}

/** The four real transactional templates (source: QaNotificationTemplate). */
export enum QaNotificationTemplate {
  PoolInvite = 'pool_invite',
  FriendRequest = 'friend_request',
  FriendAccepted = 'friend_accepted',
  ExpenseLogged = 'expense_logged',
}

/** Production workflows the console can trigger (source: QaWorkflowName). */
export enum QaWorkflowName {
  PoolInvite = 'pool_invite',
  FriendRequest = 'friend_request',
  LogExpense = 'log_expense',
  Settlement = 'settlement',
  ClosePool = 'close_pool',
}

/** Expense categories (source: ExpenseCategory — note the lowercase wire values). */
export enum ExpenseCategory {
  Dining = 'dining',
  Groceries = 'groceries',
  Transport = 'transport',
  Entertainment = 'entertainment',
  Housing = 'housing',
  MusicEvents = 'music_events',
  Sports = 'sports',
  Activities = 'activities',
  Health = 'health',
  Shopping = 'shopping',
  Travel = 'travel',
  Other = 'other',
}

/** Display labels (source: CATEGORY_LABELS in categories.constants). */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Dining]: 'Dining',
  [ExpenseCategory.Groceries]: 'Groceries',
  [ExpenseCategory.Transport]: 'Transport',
  [ExpenseCategory.Entertainment]: 'Entertainment',
  [ExpenseCategory.Housing]: 'Housing',
  [ExpenseCategory.MusicEvents]: 'Music & Events',
  [ExpenseCategory.Sports]: 'Sports',
  [ExpenseCategory.Activities]: 'Activities',
  [ExpenseCategory.Health]: 'Health',
  [ExpenseCategory.Shopping]: 'Shopping',
  [ExpenseCategory.Travel]: 'Travel',
  [ExpenseCategory.Other]: 'Other',
};

/** GET /qa/status — inner `data`. A 404 instead means "console disabled". */
export interface QaStatus {
  /** Always true when this response is reachable at all. */
  enabled: boolean;
  /** AppEnvironment wire value, e.g. "staging" | "local". */
  environment: string;
  jobs: QaJobName[];
  notificationTemplates: QaNotificationTemplate[];
  workflows: QaWorkflowName[];
  limits: {
    maxSelectedUsers: number;
    maxBroadcastRecipients: number;
    maxSyntheticUsers: number;
  };
}

// Notifications ---------------------------------------------------------------

/**
 * Preview and send share ONE body, discriminated on `template`, so each
 * template demands exactly the context its builder needs — a `friend_request`
 * body structurally cannot carry a `poolId`.
 */
export type QaNotificationTriggerBody =
  | {
      template: QaNotificationTemplate.PoolInvite;
      recipientUserIds: string[];
      poolId: string;
    }
  | {
      template: QaNotificationTemplate.FriendRequest;
      recipientUserIds: string[];
      actorUserId: string;
    }
  | {
      template: QaNotificationTemplate.FriendAccepted;
      recipientUserIds: string[];
      actorUserId: string;
    }
  | {
      template: QaNotificationTemplate.ExpenseLogged;
      recipientUserIds: string[];
      actorUserId: string;
      poolId: string;
      /** Integer cents, passed through verbatim — the QA layer never divides. */
      amountCents: number;
      merchantName?: string | null;
      transactionId?: string | null;
    };

/** One built payload. `pushTitle`/`pushBody` are null when the template won't push. */
export interface QaNotificationPreview {
  userId: string;
  type: string;
  title: string;
  body: string;
  pushTitle: string | null;
  pushBody: string | null;
  poolId: string | null;
  transactionId: string | null;
  targetUserId: string | null;
}

/** POST /qa/notifications/preview — one entry per recipient. */
export interface QaNotificationPreviewResponse {
  template: QaNotificationTemplate;
  previews: QaNotificationPreview[];
}

/**
 * POST /qa/notifications/send.
 *
 * NOTE: there is no per-recipient failure list — the API reports how many
 * recipients `notify()` was invoked for, and which ids. Absence from
 * `recipientIds` is the only failure signal available.
 */
export interface QaNotificationSendResponse {
  template: QaNotificationTemplate;
  sentCount: number;
  recipientIds: string[];
}

/** POST /qa/notifications/push — arbitrary copy to explicitly selected users. */
export interface QaPushSendBody {
  recipientUserIds: string[];
  title: string;
  body: string;
}

/** POST /qa/notifications/broadcast — custom copy ONLY; no template variant. */
export interface QaBroadcastBody {
  title: string;
  body: string;
  confirmation: string;
}

/** Shared response of push + broadcast. */
export interface QaPushSendResponse {
  sentCount: number;
  recipientIds: string[];
}

// Jobs ------------------------------------------------------------------------

/** POST /qa/jobs/run — the job is an ENUM MEMBER in the BODY, never a path. */
export interface QaJobRunBody {
  job: QaJobName;
}

export interface QaJobRunResponse {
  job: QaJobName;
  /** Rows the real job function deleted/processed. */
  affectedCount: number;
  durationMs: number;
}

// Workflows -------------------------------------------------------------------

export interface QaWorkflowPoolInviteBody {
  actorUserId: string;
  poolId: string;
  inviteeUserIds: string[];
}

export interface QaWorkflowFriendRequestBody {
  actorUserId: string;
  targetUserIds: string[];
}

export interface QaWorkflowLogExpenseBody {
  actorUserId: string;
  poolId: string;
  amountCents: number;
  /** Required — min 1 char, max 100. */
  merchantName: string;
  category: ExpenseCategory;
}

export interface QaWorkflowSettlementBody {
  actorUserId: string;
  poolId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  method: SettlementMethod;
}

export interface QaWorkflowClosePoolBody {
  actorUserId: string;
  poolId: string;
}

/** Every workflow answers with the SAME shape. */
export interface QaWorkflowResponse {
  workflow: QaWorkflowName;
  /** Ids the delegated production function produced (member, txn, settlement…). */
  resultIds: string[];
}

// State setup -----------------------------------------------------------------

export interface QaConfirmationBody {
  confirmation: string;
}

/** Shared response of seed-demo AND wipe-demo. */
export interface QaSeedResponse {
  userCount: number;
  poolCount: number;
  transactionCount: number;
  /** Accounts the wipe deliberately KEPT (platform admins + allowlisted). */
  preservedUserCount: number;
}

export interface QaSyntheticUsersBody {
  count: number;
}

export interface QaSyntheticUsersResponse {
  createdCount: number;
  userIds: string[];
  emails: string[];
}

// Inspect ---------------------------------------------------------------------

/** Push-token platform (source: PushPlatform). */
export enum QaPushPlatform {
  Ios = 'ios',
  Android = 'android',
}

/** A push token summary — ALREADY masked server-side; never the raw token. */
export interface QaPushTokenSummary {
  id: string;
  platform: QaPushPlatform;
  deviceName: string | null;
  appVersion: string | null;
  lastUsedAt: string | null;
  /** Non-null = soft-revoked. */
  disabledAt: string | null;
  /** A short, non-sendable suffix. */
  maskedToken: string;
}

/** Source: NotificationPreferences in notification.types.ts. */
export interface QaNotificationPreferences {
  /** Master switch. False = no pushes at all, whatever the category set says. */
  pushEnabled: boolean;
  /** Categories the user has opted OUT of. */
  disabledCategories: string[];
  /** True opt-in (defaults false) for proactive discovery nudges. */
  discoveryNudgesEnabled: boolean;
}

export interface QaMembershipSummary {
  poolId: string;
  poolName: string;
  role: string;
  status: string;
}

/**
 * Mirrors `MyBalancesSummary` verbatim — integer cents, straight through from
 * `computeMyBalances`. The QA layer computes nothing.
 */
export interface QaUserBalances {
  totalOwedToYouCents: number;
  totalYouOweCents: number;
  netCents: number;
  perPool: Array<{ poolId: string; poolName: string; netCents: number }>;
}

export interface QaRecentNotification {
  id: string;
  type: string;
  title: string;
  isRead: boolean;
  createdAt: string;
}

/** GET /qa/inspect/user?userId=… — inner `data`. */
export interface QaUserInspection {
  userId: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  isDiscoverable: boolean;
  deletedAt: string | null;
  isPlatformAdmin: boolean;
  featureFlags: Record<string, boolean>;
  memberships: QaMembershipSummary[];
  balances: QaUserBalances;
  notificationPreferences: QaNotificationPreferences;
  pushTokens: QaPushTokenSummary[];
  recentNotifications: QaRecentNotification[];
}

// State setup: deposit, account reset, forced pool status ----------------------

/** Exact literal for an account reset (source: QA_TOOLS.RESET_ACCOUNT_CONFIRMATION). */
export const QA_RESET_ACCOUNT_CONFIRMATION = 'RESET THIS ACCOUNT';

/**
 * Deposit ceiling in integer cents (source: PAYMENT_LIMITS.MAX_DEPOSIT_CENTS =
 * 10_000_00). The console deliberately gets no wider range than the app.
 */
export const QA_MAX_DEPOSIT_CENTS = 1_000_000;

/** POST /qa/state/deposit — funds a pool via the REAL `payment.processDeposit`. */
export interface QaDepositBody {
  /** The depositing member; `processDeposit` enforces active membership. */
  actorUserId: string;
  poolId: string;
  amountCents: number;
}

/**
 * 201. NOTE: `cardNumber` from the underlying `DepositResult` is deliberately
 * NOT surfaced by the API — the same reasoning that masks push tokens. Do not
 * add a field for it.
 */
export interface QaDepositResponse {
  depositId: string;
  poolId: string;
  userId: string;
  amountCents: number;
  status: string;
  /** Server-authoritative pool balance AFTER the deposit, in integer cents. */
  newBalanceCents: number;
}

/** One step of a composed account reset (source: QaResetStep). */
export enum QaResetStep {
  LeavePool = 'leave_pool',
  DeleteAccount = 'delete_account',
  Recreate = 'recreate',
}

export enum QaResetStepStatus {
  Succeeded = 'succeeded',
  /** Not applicable — e.g. `recreate` when it wasn't requested. */
  Skipped = 'skipped',
  /**
   * Attempted and REFUSED by the production function. The commonest case is a
   * pool OWNER, whom `leavePool` correctly refuses; the reset records that and
   * moves on, and the subsequent `deleteMe` marks the membership LEFT anyway.
   */
  Failed = 'failed',
}

export interface QaResetStepResult {
  step: QaResetStep;
  status: QaResetStepStatus;
  /** Pool id for `leave_pool`; new user id for `recreate`; else the user id. */
  targetId: string | null;
  /** Why it was skipped or refused. A message, never a stack trace. */
  detail: string | null;
}

export interface QaResetAccountBody {
  userId: string;
  /** Mint a replacement synthetic account afterwards. Defaults to false. */
  recreate?: boolean;
  confirmation: string;
}

/**
 * 200 — but **NOT ATOMIC**, which is exactly why `steps` exists. Each delegated
 * production function opens its own transaction, so individual steps can be
 * `failed` while the overall call succeeds. Rendering this as a flat success
 * would be actively misleading; always show the per-step outcomes.
 *
 * 409 when the target is a platform admin; 404 when the user is unknown.
 */
export interface QaResetAccountResponse {
  userId: string;
  steps: QaResetStepResult[];
  /** Non-null only when `recreate` was requested AND succeeded. */
  replacementUserId: string | null;
  replacementEmail: string | null;
}

/**
 * Exact literal for forcing a pool status.
 *
 * This control earns a typed confirmation despite deleting nothing: unlike wipe
 * or reset it is not destructive to DATA, it is destructive to TRUTH. It
 * manufactures states the product itself cannot produce, so a careless click
 * costs nobody a row — it costs someone hours chasing a bug that was never
 * real.
 */
export const QA_FORCE_POOL_STATUS_CONFIRMATION = 'FORCE POOL STATUS';

/**
 * POST /qa/state/pool-status — note there is NO actor: this endpoint does not
 * execute as anybody, because it does not delegate to a production function.
 */
export interface QaPoolStatusBody {
  poolId: string;
  status: PoolStatus;
  confirmation: string;
}

/**
 * 200. ⚠️ THE ONE ENDPOINT THAT BYPASSES THE DELEGATE-TO-PRODUCTION-CODE RULE.
 *
 * No production function performs `CLOSED → ACTIVE`, so this can produce states
 * the app itself cannot reach, and it deliberately does NOT reconcile derived
 * state — forcing a funded pool to CLOSED leaves its balance untouched, where
 * the real `closePool` would have zeroed it. `warning` is returned in the
 * payload on purpose so the caveat travels with the response; render it
 * VERBATIM and prominently.
 *
 * 404 when the pool is unknown.
 */
export interface QaPoolStatusResponse {
  poolId: string;
  previousStatus: string;
  status: string;
  /** Always true — a marker that this state was reached by fiat, not by the app. */
  forced: true;
  warning: string;
}
