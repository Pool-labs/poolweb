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
 *   - packages/shared/src/types/safety.types.ts          (#158 moderation queue)
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

/** Pool kind (source: pool.types.ts `PoolType`). Lowercase on the wire. */
export enum PoolType {
  Roommates = 'roommates',
  Trip = 'trip',
  GoingOut = 'going_out',
  Recurring = 'recurring',
  Custom = 'custom',
}

/**
 * Transaction row status.
 *
 * ⚠️ THESE ARE THE PRISMA VALUES, NOT `packages/shared`'s `TransactionStatus`.
 * The shared package also exports a lowercase `pending | verified | disputed`
 * enum — but the admin metrics service imports `TransactionStatus` from
 * `@prisma/client` (`admin-metrics.service.ts`) and seeds `byStatus` from
 * THOSE values, so the lowercase set never appears on this wire. Mirroring the
 * wrong one is silent: every key simply misses its colour.
 */
export enum TransactionStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  Completed = 'COMPLETED',
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

/** The rolling window a windowed metric covers — `[since, now)`. */
export interface AdminMetricsWindow {
  days: number;
  since: string;
}

/**
 * The window IMMEDIATELY BEFORE the current one, of the same length (#624).
 *
 * ⚠️ THE DELTA NEEDS NO SECOND REQUEST. Every windowed metric returns its
 * `previous…` twins in the SAME response over this window, so a tile's
 * comparison is a subtraction on data the page already holds — there is no
 * `compare` flag to pass and no second `days` value to keep in sync. Snapshot
 * metrics (active users, engagement) carry no previous window at all: a single
 * mutable column has no past, which is also why the DAU/WAU/MAU TREND is not
 * servable (poolmobile#648) and only the snapshot tile exists.
 */
export interface AdminPreviousWindow {
  since: string;
  until: string;
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

/**
 * ⚠️ EVERY #624 FIELD BELOW IS OPTIONAL, for the #618 reason at line 273: the
 * #112 switch can point this page at any Pool API — including a developer's
 * `local` one — and a required field would turn "this API predates #624" into a
 * page that renders `undefined` where a number belongs. Optional lets each
 * panel say what it could not get and keep the rest of the page alive, which is
 * the Stats page's own acceptance criterion.
 *
 * Both deployed environments DO serve #624 as of 2026-09-18 (poolmobile#651
 * merged as `327f8ee`, an ancestor of the `95feb39` image production runs), so
 * these are optional against a future/older API, not against today's.
 */
export interface AdminSignupsMetrics {
  window: { days: number; since: string };
  totalInWindow: number;
  totalAllTime: number;
  series: AdminSignupSeriesPoint[];
  previousWindow?: AdminPreviousWindow;
  previousTotalInWindow?: number;
}

/**
 * Server-derived activation (#592) — accounts with NO unmet signup requirement,
 * computed from `users` through the same predicate the app's wizard uses. This
 * is the cross-check for the auth funnel's client-emitted
 * `onboarding_completed`: a divergence between the two IS a telemetry outage.
 *
 * ⚠️ `signupsInWindow` here is this metric's OWN denominator (non-DELETED
 * accounts created in the window) and may sit below the signups panel's
 * `totalInWindow`, which counts the historical signup regardless of a later
 * soft-delete. Numerator and denominator always share a population — the
 * property a rate needs — so the two panels are deliberately not forced to
 * agree.
 */
export interface AdminActivationMetrics {
  window: { days: number; since: string };
  /** Non-deleted accounts, all time. */
  totalUsers: number;
  /** Of those, how many have no unmet signup requirement. */
  activatedAllTime: number;
  activationRateAllTime: number;
  /** Non-deleted accounts created in the window — this metric's denominator. */
  signupsInWindow: number;
  activatedInWindow: number;
  activationRateInWindow: number;
  /**
   * Where the un-activated are stuck, all-time, by SignupRequirement. An
   * account blocked on several is counted under each.
   */
  blockedByRequirement: Record<string, number>;
  previousWindow?: AdminPreviousWindow;
  /**
   * The previous window's COHORT, judged NOW (#624). Activation is a property
   * of an account's current state — there is no activation timestamp — so this
   * answers "how did last window's signups turn out", not "what would this
   * panel have said a window ago".
   */
  previousSignupsInWindow?: number;
  previousActivatedInWindow?: number;
  previousActivationRateInWindow?: number;
}

/** One day of new pools split by visibility (#624). */
export interface AdminPoolVisibilitySeriesPoint {
  date: string;
  public: number;
  private: number;
}

export interface AdminPoolMetrics {
  total: number;
  byType: Record<string, number>;
  byVisibility: Record<string, number>;
  byStatus: Record<string, number>;
  newPoolsSeries: TimeSeriesPoint[];
  window?: AdminMetricsWindow;
  /**
   * #624 — pools with `deletedAt` set (the #83 admin suspend). The ONE figure
   * here that counts soft-deleted pools; every other distribution excludes
   * them, so `suspended` does not sum with `byStatus`.
   */
  suspended?: number;
  /**
   * #624 — by #236 category, every `PoolCategory` seeded to 0 plus
   * `uncategorized` for pools created before #236.
   */
  byCategory?: Record<string, number>;
  /** #624 — pools by ACTIVE-member count, in bucket order, every bucket present. */
  byMemberCount?: MetricBucket[];
  /** #624 — new pools per day, split PUBLIC / PRIVATE. */
  newPoolsByVisibilitySeries?: AdminPoolVisibilitySeriesPoint[];
  newInWindow?: number;
  previousWindow?: AdminPreviousWindow;
  previousNewInWindow?: number;
}

/**
 * Transaction ROW COUNTS. ⚠️ THERE ARE NO AMOUNTS HERE, AND THERE STILL WILL
 * NOT BE: money volume now has its own endpoint and its own type
 * (`AdminMoneyMetrics`, poolmobile#647), because that one is deliberately
 * UNCACHED while this one is cached. Keeping them apart is the decision — do
 * not "simplify" by folding cents into this shape.
 */
export interface AdminTransactionMetrics {
  total: number;
  byStatus: Record<string, number>;
  series: TimeSeriesPoint[];
  window?: AdminMetricsWindow;
  totalInWindow?: number;
  /** #624 — settlements by #38 status, all time, every status seeded to 0. */
  settlementsByStatus?: Record<string, number>;
  settlementsInWindow?: number;
  /** #624 — COMPLETED deposit rows created in the window. */
  depositsInWindow?: number;
  previousWindow?: AdminPreviousWindow;
  previousTotalInWindow?: number;
  previousSettlementsInWindow?: number;
  previousDepositsInWindow?: number;
}

/**
 * The CAPTURED daily activity series (poolmobile#648).
 *
 * ⚠️ THIS IS THE ONE ADMIN SERIES THAT IS STORED, NOT DERIVED, and every
 * consumer has to understand why. `users.lastActivityAt` is a single mutable
 * column overwritten in place, so the server literally cannot answer "how many
 * were active on the 3rd" after the 4th begins. A nightly job captures it, and
 * NOTHING CAN BACKFILL IT.
 *
 * ⚠️ WHICH IS WHY `collectingSince`, `daysCaptured` AND `daysMissingInWindow`
 * ARE NOT OPTIONAL GARNISH. Five points inside a 30-day window is the identical
 * picture for "we started collecting five days ago", "activity collapsed" and
 * "the capture job has been broken for three weeks" — wildly different facts,
 * one chart. A panel that draws the line without rendering these is telling a
 * story the data cannot support.
 */
export interface AdminActiveUserTrendPoint {
  /** UTC `YYYY-MM-DD`. */
  date: string;
  /** ⚠️ The three windows OVERLAP: dau ⊆ wau ⊆ mau. Never sum them. */
  dau: number;
  wau: number;
  mau: number;
}

/** GET /admin/metrics/active-users/trend — inner `data`. */
export interface AdminActiveUserTrend {
  window: AdminMetricsWindow;
  /** Oldest first. A day never captured is ABSENT, never a zero row. */
  series: AdminActiveUserTrendPoint[];
  /** The earliest day ever captured, or null before the job's first run. */
  collectingSince: string | null;
  /** Total rows ever captured, across all time — not just this window. */
  daysCaptured: number;
  /** Days in the window with no row. Non-zero means the job missed days. */
  daysMissingInWindow: number;
}

/**
 * Platform-wide money volume (poolmobile#647) — the ONE admin response that
 * carries cents.
 *
 * ⚠️ IT IS NOT CACHED SERVER-SIDE, AND THAT IS THE POINT. Founder decision D1
 * deferred this until the caching question had an answer; the answer taken was
 * to serve the figures from a SEPARATE, uncached endpoint rather than adding
 * cents to the cached `/metrics/transactions`. If this ever gets folded into
 * that shape, it silently becomes the first cached admin response carrying
 * money — the exact thing D1 was holding the line on.
 *
 * ⚠️ AGGREGATE ONLY. Never a person's figure and never a pool's balance; those
 * live on the audited pool-ledger pages, where an admin reading them leaves a
 * record. Nothing here names anybody.
 *
 * Every field is INTEGER CENTS. Format with `formatMoney`; never do float math.
 */
export interface AdminMoneyDayPoint {
  /** UTC `YYYY-MM-DD`. */
  date: string;
  depositedCents: number;
  spentCents: number;
}

/** GET /admin/metrics/money — inner `data`. */
export interface AdminMoneyMetrics {
  window: AdminMetricsWindow;
  previousWindow: AdminPreviousWindow;
  /** COMPLETED deposits created in the window. */
  depositedCentsInWindow: number;
  /** COMPLETED, non-deleted expense spend created in the window. */
  spentCentsInWindow: number;
  previousDepositedCentsInWindow: number;
  previousSpentCentsInWindow: number;
  /**
   * Per-day, for the trend. ⚠️ A day with NO movement on either side is
   * ABSENT rather than a zero row, so never index this by day offset — and a
   * day present with `spentCents: 0` really did see no spend.
   */
  series: AdminMoneyDayPoint[];
  /**
   * The signed net of EVERY ledger adjustment, all time (credits positive,
   * debits negative). All-time rather than windowed on purpose: it is a
   * reconciliation term, not an activity figure.
   */
  netAdjustmentsCentsAllTime: number;
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

/**
 * The Pool Points economy (#251), derived from `point_transactions` — the
 * ledger, never `analytics_events`. No money anywhere in this shape: points are
 * a bare integer and there is no `…Cents` field to add.
 */
export interface AdminPointReasonMetric {
  reason: string;
  awards: number;
  points: number;
  /** ⚠️ An earning rule nobody reaches is a DEAD RULE — that is what this counts. */
  distinctEarners: number;
}

export interface AdminPointsTotals {
  awards: number;
  points: number;
  distinctEarners: number;
}

export interface AdminPointsMetrics {
  windowDays: number;
  /**
   * One row per reason, earners first and points-descending; since #624 every
   * ACTIVE reason that earned nothing is appended as a zero row, so a rule
   * nobody reaches reads as a zero rather than as an absence.
   */
  byReason: AdminPointReasonMetric[];
  totals: AdminPointsTotals;
  previousWindow?: AdminPreviousWindow;
  previousTotals?: AdminPointsTotals;
  daily: {
    medianPerEarnerPerDay: number;
    p90PerEarnerPerDay: number;
    /**
     * Share (0–1) of user-days that hit the daily grindable cap. A rate that is
     * not near zero means the backstop has become the binding constraint.
     */
    grindableCapHitRate: number;
    earnerDays: number;
  };
}

// ─── Geography (#624, source: admin-metrics.types.ts) ────────────────────────
//
// `GET /admin/metrics/geography?days=` — where users and pools ARE, grouped by
// the canonical city key (#128/#469).
//
// ⚠️ THE PRIVACY LINE IS STRUCTURAL, NOT A FILTER, AND THIS FILE IS WHERE IT
// SHOWS. There is no user coordinate in any shape below, because the query
// that counts users selects none — so none can reach this dashboard. A city's
// point is either the curated anchor or the mean of its PUBLIC + ACTIVE pools
// (both already public data, since Discover publishes a public pool's
// coordinates to every signed-in user), and exact pins exist only for pools
// whose owner opted in (#21). An individual's raw coordinates stay on the
// AUDITED `GET /admin/users/:id`, which is the whole reason this aggregate is
// allowed to be un-audited: it names nobody.

/** Where a city's map point came from. */
export enum AdminGeographyCentroidSource {
  /** The curated `CITIES` anchor coordinate. */
  Curated = 'curated',
  /** The mean coordinate of the city's PUBLIC + ACTIVE pools. */
  Pools = 'pools',
}

/** One city — one canonical `locationCityKey`. */
export interface AdminGeographyCity {
  /** The key exactly as stored — and the value `?city=` filters on. */
  key: string;
  /** Human-readable name: the curated label, else a stored display string. */
  display: string;
  /** Subdivision code parsed from the key (US/CA only, #469), uppercase. */
  regionCode: string | null;
  /** ISO alpha-2 parsed from the key, uppercase; null when the key has none. */
  countryCode: string | null;
  userCount: number;
  poolCount: number;
  /** Of `userCount`, created inside the window. */
  newUserCount: number;
  /** Of `poolCount`, created inside the window. */
  newPoolCount: number;
  /** The city's map point, or null when neither source exists. */
  lat: number | null;
  lng: number | null;
  centroidSource: AdminGeographyCentroidSource | null;
}

/** Cities rolled up to their country. `countryCode` null = keys carrying none. */
export interface AdminGeographyCountry {
  countryCode: string | null;
  userCount: number;
  poolCount: number;
  cityCount: number;
}

/** Cities rolled up to their subdivision (US states / CA provinces, #469). */
export interface AdminGeographyRegion {
  countryCode: string;
  regionCode: string;
  regionName: string | null;
  userCount: number;
  poolCount: number;
  cityCount: number;
}

/**
 * One PUBLIC + ACTIVE pool whose owner opted into showing its exact venue
 * (#21) — data Discover already publishes — and nothing else about it.
 */
export interface AdminGeographyVenuePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  venueAddress: string | null;
}

export interface AdminGeographyMetrics {
  window: AdminMetricsWindow;
  /**
   * Sorted by `userCount + poolCount` desc, then key, and CAPPED — with
   * `citiesTruncated` saying so. ⚠️ Never present a truncated list as the whole
   * world: the roll-ups below are computed over EVERY city before the cap, so a
   * truncated list never under-counts a country.
   */
  cities: AdminGeographyCity[];
  citiesTruncated: boolean;
  countries: AdminGeographyCountry[];
  regions: AdminGeographyRegion[];
  /** Non-deleted users with no city. */
  usersWithoutCity: number;
  /** Non-deleted pools with no city. */
  poolsWithoutCity: number;
  /** Newest first, capped. */
  exactVenuePools: AdminGeographyVenuePin[];
  exactVenuePoolsTruncated: boolean;
}

// ─── Leaderboard headlines (#681, source: leaderboards.types.ts) ────────────

/** The five global boards, in the server's own display order. */
export enum GlobalLeaderboardBoard {
  TopPoolsByTransactions = 'topPoolsByTransactions',
  MostActive = 'mostActive',
  MostMembers = 'mostMembers',
  LongestRunning = 'longestRunning',
  FastestGrowing = 'fastestGrowing',
}

export enum LeaderboardPeriod {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year',
}

/**
 * Rank 1 of one board.
 *
 * ⚠️ NULL FIELDS MEAN THE BOARD IS EMPTY — no pool qualifies — which is a
 * different fact from a pool sitting at zero, and the panel must not render
 * them the same way. The server reports every board rather than omitting an
 * empty one precisely so this stays visible.
 *
 * ⚠️ THERE IS NO MONEY HERE ON PURPOSE. `value` is the board's own ranking
 * metric — a count on four boards, days on `longestRunning`. The global
 * boards' one cents field is deliberately not projected onto `/admin` (#647).
 */
export interface LeaderboardHeadline {
  board: GlobalLeaderboardBoard;
  poolId: string | null;
  poolName: string | null;
  value: number | null;
}

/** GET /admin/metrics/leaderboards — inner `data`. */
export interface LeaderboardHeadlines {
  period: LeaderboardPeriod;
  boards: LeaderboardHeadline[];
}

// ─── In-app support (#683, source: messaging.types.ts) ──────────────────────
//
// ⚠️ THESE ARE THE MEMBER-FACING SHAPES, NOT ADMIN ONES, and that is the point.
// The admin endpoints delegate to the same `listConversations` / `listMessages`
// / `sendMessage` a member calls, passing the SUPPORT ACCOUNT's id — so they
// return exactly what the app receives. Minting an `AdminSupportThread` DTO
// here would be a second shape for one fact, i.e. the #618/#623 drift, for no
// gain: the admin surface wants the same fields.

/** A participant on a support thread. Carries NO email (`messaging.types.ts`). */
export interface ConversationParticipant {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * One message.
 *
 * ⚠️ `body` IS EMPTY when `deletedAt` is set (an admin redaction, #158 D9) or
 * `hiddenByBlock` is true — stripped SERVER-SIDE before the row leaves the API.
 * The UI renders the state, never a fallback to some other field.
 */
export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  hiddenByBlock: boolean;
}

/** One support thread. */
export interface SupportConversation {
  id: string;
  kind: string;
  poolId: string | null;
  poolName: string | null;
  title: string | null;
  createdById: string;
  requestState: string;
  requestedById: string | null;
  participants: ConversationParticipant[];
  lastMessage: ConversationMessage | null;
  lastMessageAt: string;
  /**
   * Unread FOR THE SUPPORT ACCOUNT — i.e. "this person is waiting on an
   * answer". The one figure on this surface that is genuinely a work queue.
   */
  unreadCount: number;
  isMuted: boolean;
  createdAt: string;
  isSupport: boolean;
}

/** GET /admin/support/conversations — inner `data`. */
export interface SupportConversationListResponse {
  items: SupportConversation[];
  nextCursor: string | null;
  totalUnreadCount: number;
  pendingRequestCount: number;
}

/** GET /admin/support/conversations/:id/messages — inner `data`. */
export interface SupportMessageListResponse {
  items: ConversationMessage[];
  nextCursor: string | null;
}

/** POST /admin/support/conversations/:id/messages — inner `data`. */
export interface SupportReplyResponse {
  message: ConversationMessage;
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
  /**
   * #624 — the city, CITY-LEVEL ONLY: a display string and the canonical
   * #128/#469 key, which is what `GET /admin/users?city=` filters on. There are
   * deliberately no coordinates on a list row; those stay on the audited detail
   * read. Optional for the #618 reason — an older API simply omits them, and
   * the column renders "—" rather than the page breaking.
   */
  locationCity?: string | null;
  locationCityKey?: string | null;
}

/**
 * ── ADMIN CREATION (poolmobile#684) ────────────────────────────────────────
 *
 * ⚠️ NOT SERVED YET. `POST /admin/users` and `POST /admin/pools` do not exist
 * on any environment as of 2026-09-18 — the admin API can suspend, restore,
 * flag, adjust and impersonate, but it cannot create. Both calls therefore 404
 * today, and the dialogs say exactly that rather than showing a generic
 * failure; `describeCreateFailure` in `lib/admin/adminErrors.ts` is where that
 * lives.
 *
 * These shapes are this repo's HALF of a contract that does not exist yet, so
 * they are pinned on poolmobile#684 for the server to match. The one naming
 * decision worth defending: `isNewUser`, because that is what
 * `findOrCreateUserByEmail` already returns — the endpoint is a thin
 * delegation to it, and inventing a second word for the same fact is how two
 * repos drift (#618/#623).
 */

/** POST /admin/users — body. */
export interface AdminCreateUserBody {
  email: string;
  /** Free text, AUDITED (#26). Required: these rows are otherwise
   *  indistinguishable from organic signups six months later. */
  reason: string;
}

/**
 * POST /admin/users — inner `data`.
 *
 * ⚠️ `isNewUser` IS LOAD-BEARING. The endpoint delegates to
 * `findOrCreateUserByEmail`, which is find-OR-create: reporting "created" for
 * an address that already had an account is a silent lie, and the UI branches
 * on this to say "this account already existed" instead.
 */
export interface AdminCreateUserResponse {
  user: AdminUserSummary;
  isNewUser: boolean;
}

/** POST /admin/pools — body. */
export interface AdminCreatePoolBody {
  /**
   * The pool's OWNER — an explicitly chosen existing user, never the acting
   * admin by default. An admin-owned pool is a support artefact nobody else
   * can leave or govern.
   */
  ownerUserId: string;
  name: string;
  type: PoolType;
  /**
   * ⚠️ PRIVATE from this surface. `createPoolSchema` requires a PUBLIC pool to
   * carry a non-empty short description AND a canonical city — and #194 makes
   * that city PICKER-ONLY, so a typed one is a 400. This dashboard has no
   * canonical city picker (the geography list is cities already in use, which
   * is the wrong domain for a brand-new pool), so the admin path creates the
   * invite-first private pool and the owner turns it public in-app through the
   * guarded visibility endpoint that exists for exactly that.
   */
  visibility: PoolVisibility;
  /** Integer cents, `0` for none. */
  contributionAmountCents: number;
  /** Free text, AUDITED (#26), same rule as the user create. */
  reason: string;
}

/** POST /admin/pools — inner `data`. */
export interface AdminCreatePoolResponse {
  pool: AdminPoolSummary;
}

/** Pool name bounds (source: `POOL_NAME_LENGTH`). */
export const POOL_NAME_LENGTH = { MIN: 1, MAX: 50 } as const;

/** Contribution ceiling (source: `POOL_LIMITS.MAX_DEPOSIT_CENTS`). */
export const MAX_CONTRIBUTION_CENTS = 10_000_00;

/** Audited-reason bounds, matching the #84 impersonation precedent. */
export const ADMIN_CREATE_REASON_LENGTH = { MIN: 10, MAX: 280 } as const;

export interface AdminUserMembershipSummary {
  owner: number;
  admin: number;
  member: number;
}

/**
 * The widened detail contract (poolmobile #618 — the founder's 2026-09-13
 * decisions: full detail INCLUDING the sensitive tier, and the user read is
 * AUDITED ON VIEW server-side as `admin.user_detail_viewed`).
 *
 * ⚠️ Every #618 field is OPTIONAL here on purpose. The dashboard renders
 * against whichever API the #112 switch points at, and production is on a
 * pre-#618 image (its `/admin/users/:id` returns the narrow shape above the
 * line). A required field would make the page a liar about a payload that
 * simply predates it; an optional one lets each section say "not reported by
 * this API version" instead. `hasRichUserDetail` is the one predicate that
 * decides which of the two the page is looking at.
 *
 * Field names are the Prisma column names — the same names #618's allowlist
 * select will emit — so wiring the data on is a server deploy, not a second
 * frontend change.
 */

/** A linked social identity (#266). `provider` is `apple` | `google`. */
export interface AdminUserIdentitySummary {
  provider: string;
  /** ISO-8601; when the identity was linked. */
  linkedAt: string;
}

/**
 * The five payment handles (#146/#250) — the sensitive tier's sharpest edge:
 * a Zelle handle IS an email and an Interac handle IS a phone number.
 * `null` = not set (an unconfirmed handle is unrepresentable server-side).
 */
export interface AdminUserPaymentHandles {
  venmo: string | null;
  cashapp: string | null;
  paypal: string | null;
  zelle: string | null;
  interac: string | null;
}

/** One pool the user is an ACTIVE member of — the row the page links through. */
export interface AdminUserPoolMembership {
  poolId: string;
  poolName: string;
  role: string;
  /** ISO-8601. */
  joinedAt: string;
  poolStatus?: PoolStatus;
  poolVisibility?: PoolVisibility;
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

  // ── #618 — location. Country + region + city all derive from the key. ──
  locationCity?: string | null;
  /** `name|region|country` (#128/#469) — parsed by `parseCityKey`. */
  locationCityKey?: string | null;
  shareLocation?: boolean;
  locationUpdatedAt?: string | null;
  /** Sensitive tier (founder decision): raw coordinates. */
  locationLat?: number | null;
  locationLng?: number | null;

  // ── #618 — profile. ──
  /** Sensitive tier: the exact date of birth (ISO-8601). */
  dateOfBirth?: string | null;
  gender?: string | null;
  occupation?: string | null;
  occupationDetail?: string | null;
  lifestyleStatus?: string | null;
  lifestyleDetail?: string | null;
  interests?: string[];
  customInterests?: string[];
  bio?: string | null;
  isDiscoverable?: boolean;

  // ── #618 — engagement / account. ──
  /** Last seen (ISO-8601). */
  lastActivityAt?: string | null;
  pointBalance?: number;
  lifetimePoints?: number;
  currentStreak?: number;
  longestStreak?: number;
  /** #453 — set when Apple's relay (or the address itself) reported dead. */
  emailUndeliverableAt?: string | null;
  hasPassword?: boolean;
  identities?: AdminUserIdentitySummary[];
  trustedDeviceCount?: number;
  pushTokenCount?: number;

  // ── #618 — sensitive tier: payment handles + preferred rail. ──
  paymentHandles?: AdminUserPaymentHandles;
  preferredPaymentProvider?: string | null;

  // ── #618 — memberships, upgraded from counts to the actual pools. ──
  pools?: AdminUserPoolMembership[];

  // ── #618 — staging context (#566 / #479). Null/absent in production. ──
  seedCohort?: string | null;
  demoMode?: string | null;
}

/**
 * Whether the payload is the widened #618 shape. A pre-#618 API omits every
 * new key, so the presence of ANY one that the server always includes (nullable
 * or not) is the discriminator — `lastActivityAt` is emitted unconditionally
 * by the widened select, even when null.
 */
export function hasRichUserDetail(user: AdminUserDetail): boolean {
  return 'lastActivityAt' in user;
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
  /** #624 — the pool's city; the key is what `GET /admin/pools?city=` filters on. */
  locationCity?: string | null;
  locationCityKey?: string | null;
}

export interface AdminPoolCreatorSummary {
  id: string;
  email: string | null;
  displayName: string | null;
}

/**
 * One ACTIVE member on the pool detail's roster (#618). Deliberately
 * name/username/role/joinedAt ONLY — a pool is not a person, so the pool read
 * is not audited, and it therefore never carries a member's contact details
 * or handles (those live on the audited user page one click away).
 */
export interface AdminPoolMemberSummary {
  userId: string;
  displayName: string | null;
  username: string | null;
  role: string;
  /** ISO-8601. */
  joinedAt: string;
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

  // ── #618 — location. ──
  locationCity?: string | null;
  /** `name|region|country` (#128/#469) — parsed by `parseCityKey`. */
  locationCityKey?: string | null;
  /** #21 — the owner's opt-in to publish the exact venue. */
  showExactVenue?: boolean;
  venueAddress?: string | null;
  /** Sensitive tier (founder decision): raw coordinates. */
  locationLat?: number | null;
  locationLng?: number | null;

  // ── #618 — about: what the pool is FOR. ──
  /** #236 taxonomy — free text, deliberately not an enum. */
  category?: string | null;
  subcategory?: string | null;
  tags?: string[];
  customTags?: string[];
  /** #401 house rules — advisory, never enforced. */
  rules?: string | null;
  shortDescription?: string | null;

  // ── #618 — money (integer cents) + config. ──
  contributionAmountCents?: number;
  totalSpentCents?: number;
  totalExpenses?: number;
  /** #106 — signed net of admin ledger adjustments, if the API reports it. */
  netAdjustmentsCents?: number | null;
  memberLimit?: number | null;
  memberLimitMin?: number | null;
  hideFromGlobalLeaderboards?: boolean;

  // ── #618 — lifecycle extras + roster. ──
  lastActivityAt?: string | null;
  members?: AdminPoolMemberSummary[];

  // ── #618 — staging context (#566). Null/absent in production. ──
  seedCohort?: string | null;
}

/** Whether the payload is the widened #618 shape (see `hasRichUserDetail`). */
export function hasRichPoolDetail(pool: AdminPoolDetail): boolean {
  return 'category' in pool;
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
  /**
   * #106 — signed net of admin ledger adjustments. Emitted by the API since
   * the adjustments landed; optional here because a pre-#106 image omits it.
   */
  netAdjustmentsCents?: number;
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
  /**
   * ⚠️ THE DEPLOYMENT'S LIVE ROW COUNTS AFTER THE RUN — not the chosen
   * dataset's alone, and not a sum of per-dataset figures (#612). Since #525 a
   * reseed builds every switchable cohort, so presenting these beside a single
   * profile name (as this console did) told the founder that `default` had
   * built 60 users when most of them belong to the other cohorts.
   */
  userCount: number;
  poolCount: number;
  transactionCount: number;
  /** Accounts the wipe deliberately KEPT (platform admins + allowlisted). */
  preservedUserCount: number;
  /**
   * #258 — WHICH dataset now sits in the database, echoed back by the run
   * rather than assumed from the form. Null for a bare wipe, which builds
   * nothing. Optional here because a pre-#258 API omits it entirely.
   */
  profile?: string | null;
  /**
   * #525 — the OTHER cohorts the same run seeded, additively, after `profile`.
   * A reseed establishes every switchable cohort, because #479's demo switcher
   * re-anchors the viewer rather than re-seeding: a cohort with nothing behind
   * it is a switch position that lands on an empty Discover.
   *
   * Optional, and treated as absent-tolerant on purpose — that is exactly how
   * a console built against the pre-#525 shape keeps working.
   */
  alsoSeeded?: string[];
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

// ─── Errors / Health, READ-ONLY (poolmobile #116, source: @pool/shared
//     types/observability.types.ts + constants/observability-feed.constants.ts) ─
//
// Hand-copied DTOs for `GET /api/v1/admin/observability/errors` — the ONE
// endpoint this surface has (see `observabilityApi` in adminApi.ts).
//
// ⚠️ PRIVACY / SAFETY, carried over from the #116 security review: `path`,
// `errorMessage`, `message` and `requestId` are attacker-influenceable free
// text. They are safe to STORE and to render as TEXT; they must never be
// interpolated into HTML, a URL, or anything else that reinterprets them.
// The server already applies a strict field ALLOWLIST (no raw log line, no
// bodies, no headers, no stack traces) — do not widen these interfaces to
// match "whatever the API happens to send".

/** pino numeric levels — the values written into every structured log line. */
export enum PinoLevel {
  Trace = 10,
  Debug = 20,
  Info = 30,
  Warn = 40,
  Error = 50,
  Fatal = 60,
}

/**
 * Which axis of failures the feed returns.
 *
 * `Errors` is the pino level axis, `Requests` is the access-log status axis (a
 * 4xx/5xx is logged at INFO, so it is NOT reachable via the level filter), and
 * `Signals` is the third axis: named WARN lines deliberately BELOW the error
 * threshold and therefore invisible to both of the others. `All` is their
 * union — the only view in which every failure mode is visible at once, and
 * the right default for a health tab.
 */
export enum ObservabilityFeedKind {
  All = 'all',
  Errors = 'errors',
  Requests = 'requests',
  Signals = 'signals',
}

/**
 * What a log line MEANS, not just how loud it was.
 *
 * Three of these are WARN-level by design and so trip no alarm:
 * `TransactionContention` (Prisma P2028 → settlement-lock tuning) and
 * `ConnectionPoolTimeout` (P2024 → pool sizing) are split because their
 * REMEDIATIONS differ; `NotificationFailure` is the ONLY signal that a
 * systemic post-commit notification outage exists at all (every such failure
 * is swallowed and returns 200 to the caller).
 *
 * Classification is mutually exclusive and precedence-ordered server-side.
 */
export enum ObservabilitySignal {
  TransactionContention = 'transaction_contention',
  ConnectionPoolTimeout = 'connection_pool_timeout',
  NotificationFailure = 'notification_failure',
  Error = 'error',
  FailedRequest = 'failed_request',
  Other = 'other',
}

/**
 * Per-source availability. Both sources FAIL OPEN — the endpoint never 500s
 * because one of them is down; the status carries the bad news instead.
 *
 * ⚠️ This is the whole reason the tab can be honest: an empty panel is only
 * "nothing is wrong" when the status is `Ok`. Every other value means the
 * panel is empty because nobody looked.
 */
export enum ObservabilitySourceStatus {
  /** Queried successfully — an empty result genuinely means "no failures". */
  Ok = 'ok',
  /** Deliberately switched off (e.g. `SENTRY_ENABLED=false`). */
  Disabled = 'disabled',
  /** Never wired up — no log-group name / no API token. Not an incident. */
  Unconfigured = 'unconfigured',
  /** Configured but the call failed (IAM denial, timeout, upstream 5xx). */
  Unavailable = 'unavailable',
}

/**
 * One structured failure line. ALLOWLISTED server-side — notably ABSENT: the
 * raw log line, request/response bodies, headers and stack traces (stacks
 * belong in Sentry, which symbolicates them). `userId` is an opaque id.
 */
export interface ObservabilityLogEntry {
  /** ISO-8601 UTC, sourced from the CloudWatch event (not the log body). */
  timestamp: string;
  level: number;
  /** Human label for `level` — the UI needs no numeric map of its own. */
  levelLabel: string;
  /** Free text. Render as TEXT only. */
  message: string | null;
  /** The correlation key — traces one request across logs, audit and Sentry. */
  requestId: string | null;
  method: string | null;
  /** Free text. Render as TEXT only — never as an href. */
  path: string | null;
  status: number | null;
  durationMs: number | null;
  userId: string | null;
  /** Never null. */
  signal: ObservabilitySignal;
  /** Fixed vocabulary (an ApiErrorCode, or a Prisma `P2028`/`P2024`). */
  errorCode: string | null;
  errorType: string | null;
  /** Free text. Render as TEXT only. */
  errorMessage: string | null;
  /** CloudWatch log stream — identifies WHICH task emitted the line. */
  logStream: string | null;
}

/** Counts over the returned page — no client-side aggregation required. */
export interface ObservabilityFeedSummary {
  errorCount: number;
  failedRequestCount: number;
  /** `status` → count, e.g. `{ "404": 12, "500": 3 }`. */
  byStatus: Record<string, number>;
  /** `levelLabel` → count. */
  byLevel: Record<string, number>;
  /**
   * `ObservabilitySignal` → count — the series this tab CHARTS. EVERY key is
   * present (zeros included), so a series never vanishes between refreshes and
   * a signal dropping to zero reads as "recovered", not "disappeared". Do not
   * filter zero-valued keys out of the chart.
   */
  bySignal: Record<ObservabilitySignal, number>;
}

/** One grouped Sentry issue — the dedup/trend view raw logs cannot give. */
export interface ObservabilitySentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string | null;
  level: string | null;
  count: number;
  userCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  /** Deep link into the Sentry UI. Validate before using as an href. */
  permalink: string | null;
}

export interface ObservabilitySentrySummary {
  issues: ObservabilitySentryIssue[];
  /** The Sentry query these issues answer, echoed so the heading can't drift. */
  query: string;
}

/** Where the CloudWatch half came from, so the tab can PROVE which env it read. */
export interface ObservabilityLogSource {
  /** The log group actually queried, or null when unconfigured. */
  logGroup: string | null;
  /** The API's own `observedEnvironment` — matches the nav's env badge. */
  environment: string;
}

export interface ObservabilityErrorsFeed {
  window: { hours: number; since: string; until: string };
  source: ObservabilityLogSource;
  logs: {
    status: ObservabilitySourceStatus;
    /** Strictly most-recent-first. */
    entries: ObservabilityLogEntry[];
    /** True when the window held more lines than `limit` — narrow the filters. */
    truncated: boolean;
    summary: ObservabilityFeedSummary;
  };
  sentry: {
    status: ObservabilitySourceStatus;
    /**
     * Link out to the Sentry issue stream. Present whenever the ORG SLUG is
     * configured — INCLUDING when the API token is not — so an unwired token
     * degrades to "open Sentry", never to a dead panel.
     */
    issuesUrl: string | null;
    /** null whenever `status !== Ok` — fail-open, never an error response. */
    summary: ObservabilitySentrySummary | null;
  };
}

/** Query contract for the feed (mirrors `observabilityErrorsQuerySchema`). */
export interface ObservabilityErrorsQuery {
  hours?: number;
  kind?: ObservabilityFeedKind;
  minLevel?: PinoLevel;
  minStatus?: number;
  limit?: number;
}

// ─── Per-user logs, READ-ONLY (poolmobile #263, source: @pool/shared
//     types/observability.types.ts + types/audit.types.ts) ────────────────────
//
// `GET /api/v1/admin/observability/user-logs?userId=&hours=&limit=` — the
// SUPPORT/DEBUG pull: one named person's request logs, audit trail and
// behavioural telemetry inside a bounded window, merged into one timeline.
//
// ⚠️ This endpoint is AUDITED ON VIEW server-side (`admin.user_logs_viewed`),
// unlike the aggregate Errors feed. Pulling it is itself a governance fact,
// because it is about an identified individual.
//
// ⚠️ PRIVACY, and it differs PER SOURCE — do not flatten them into one "event":
//   - `logs`      — the same strict ALLOWLIST as #116 (no raw lines, no bodies,
//                   no headers, no stack traces). Free text; render as TEXT.
//   - `audit`     — server-authored, and DELIBERATELY retains money (integer
//                   cents), payment handles and ids (#26). Correct to show on an
//                   identity-gated admin surface; still text-only.
//   - `analytics` — CLIENT-supplied, already stripped of PII/money/coords at
//                   ingest (#24), and therefore the least authoritative of the
//                   three. Label it as such; never treat it as proof.

/** Which store one timeline entry came from. */
export enum ObservabilityUserSource {
  Logs = 'logs',
  Audit = 'audit',
  Analytics = 'analytics',
}

/**
 * One `audit_logs` row (source: audit.types.ts `AuditLogEntry`).
 *
 * ⚠️ `action` and `targetType` are typed as STRING rather than mirrored enums,
 * deliberately. The API's `AuditAction` is an open, fast-growing vocabulary
 * (~80 dot-namespaced members and counting); a copy here would go stale the
 * first time the API adds one, and a stale mirror on a DISPLAY-ONLY surface
 * fails in the worst possible direction — the newest, least-understood action
 * would render as a blank or an "unknown" chip precisely when someone is trying
 * to work out what happened. The wire values are already human-legible
 * (`settlement.confirmed`, `admin.ledger_adjusted`), so they are rendered as
 * text and a new action needs no web deploy to read correctly.
 */
export interface AuditLogEntry {
  id: string;
  /** Dot-namespaced `AuditAction` wire value, e.g. `settlement.confirmed`. */
  action: string;
  actorId: string | null;
  /** `AuditTargetType` wire value, e.g. `pool`, `user`, `conversation`. */
  targetType: string;
  targetId: string | null;
  poolId: string | null;
  /**
   * Server-authored context. DELIBERATELY carries amounts in integer cents and,
   * for #146 rows, payment handles. Render values as TEXT — never as an href.
   */
  metadata: Record<string, unknown>;
  requestId: string | null;
  ip: string | null;
  createdAt: string;
}

/**
 * One `analytics_events` row. Sanitized at INGEST by the #24 allowlist, so
 * `props` are string-only and already stripped of PII/money/coordinates.
 */
export interface ObservabilityUserAnalyticsRecord {
  id: string;
  name: string;
  sessionId: string;
  platform: string;
  appVersion: string | null;
  props: Record<string, string>;
  /** When the CLIENT says it happened. */
  occurredAt: string;
  /** When the SERVER ingested it — the field the timeline is ordered by. */
  createdAt: string;
}

/**
 * A discriminated timeline entry. `timestamp` is lifted onto every variant so a
 * merged, newest-first ordering needs no per-source knowledge.
 */
export type ObservabilityUserTimelineEntry =
  | { source: ObservabilityUserSource.Logs; timestamp: string; log: ObservabilityLogEntry }
  | { source: ObservabilityUserSource.Audit; timestamp: string; audit: AuditLogEntry }
  | {
      source: ObservabilityUserSource.Analytics;
      timestamp: string;
      analytics: ObservabilityUserAnalyticsRecord;
    };

/** Per-source outcome — the #116 fail-open contract, one entry per store. */
export interface ObservabilityUserSourceState {
  status: ObservabilitySourceStatus;
  /** How many entries this source contributed. */
  count: number;
  /** True when the source held more rows than the requested per-source page. */
  truncated: boolean;
}

export interface ObservabilityUserLogs {
  /** Echoed back, so a response can never be mistaken for another user's. */
  userId: string;
  window: { hours: number; since: string; until: string };
  source: ObservabilityLogSource;
  /**
   * Each source fails open INDEPENDENTLY: a missing CloudWatch IAM grant still
   * returns the audit trail. There is no all-or-nothing error path — these
   * statuses carry the bad news, so an empty panel can always say WHY.
   */
  sources: {
    logs: ObservabilityUserSourceState;
    audit: ObservabilityUserSourceState;
    analytics: ObservabilityUserSourceState;
  };
  /** All three sources merged, strictly most-recent-first. */
  entries: ObservabilityUserTimelineEntry[];
}

/** Query contract (mirrors `observabilityUserLogsQuerySchema`). */
export interface ObservabilityUserLogsQuery {
  /** REQUIRED and a uuid server-side — there is deliberately no "everyone" mode. */
  userId: string;
  hours?: number;
  /** Applied PER SOURCE, so the worst-case response is three times this. */
  limit?: number;
}

// ─── Proactive admin alerting, READ-ONLY (poolmobile #190, source:
//     @pool/shared types/admin-alerts.types.ts) ───────────────────────────────
//
// `GET /api/v1/admin/observability/alerts` — identity-gated, NO query
// parameters (the watched alarm set is a fixed reviewed list and no caller
// input may widen it), and the state the dashboard's prod-critical BANNER
// renders.
//
// #116 shipped the observability read surfaces and everything still terminated
// at a CloudWatch alarm in a console nobody was watching. #190 added the email
// dispatcher and this shape, both reading the SAME `describeCriticalAlarms`
// core — so the banner and the inbox can never disagree about what is on fire.

/** The production-critical alarms this surface watches, keyed by MEANING. */
export enum AdminAlertKey {
  ServerErrorRate = 'server_error_rate',
  NotificationFailureRate = 'notification_failure_rate',
  BalanceDrift = 'balance_drift',
}

/** CloudWatch's alarm states, plus the one CloudWatch cannot report. */
export enum AdminAlarmState {
  Ok = 'ok',
  Alarm = 'alarm',
  InsufficientData = 'insufficient_data',
  /**
   * ⚠️ NOT a synonym for OK, and the distinction is load-bearing.
   *
   * The alarm was not returned by `DescribeAlarms` at all — production's
   * Terraform has not been applied since the #53 drift, so an alarm this code
   * knows about may genuinely not exist there yet. Rendering it as "healthy"
   * would be the single most misleading thing this surface could do, so the UI
   * renders it as NOT REPORTING (the #116 `ObservabilitySourceStatus`
   * convention applied one level down).
   */
  Unknown = 'unknown',
}

/**
 * Why alert email is or is not leaving this environment.
 *
 * Mutually exclusive, and precedence is STRUCTURAL-FIRST server-side: the
 * environment allowlist is evaluated before the killswitch, so
 * `ADMIN_ALERTS_ENABLED=true` on staging reports `EnvironmentNotEligible` and
 * never `Sending`. A dashboard that says "no emails are being sent" must always
 * be able to say WHY, so nobody reads a quiet inbox as "nothing is wrong".
 */
export enum AdminAlertEmailStatus {
  /** Fully armed: a new ALARM transition will email every active admin. */
  Sending = 'sending',
  /** Not on the alert-email allowlist. The gate staging can never argue with. */
  EnvironmentNotEligible = 'environment_not_eligible',
  /** Eligible environment, but `ADMIN_ALERTS_ENABLED` is not `true`. */
  KillswitchOff = 'killswitch_off',
  /** The environment suppresses ALL outbound email (#133 `sendsRealEmail`). */
  EmailSuppressed = 'email_suppressed',
}

/** One watched alarm's current state. */
export interface AdminAlertSummary {
  key: AdminAlertKey;
  /** The resolved CloudWatch alarm name, so an admin can find it in the console. */
  name: string;
  /**
   * Frozen human label — the SERVER's copy, never CloudWatch's, and the reason
   * this dashboard carries no alarm map of its own. A new watched alarm appears
   * here correctly labelled with no web deploy.
   */
  label: string;
  /** Frozen one-line explanation of what firing means — the server's copy. */
  description: string;
  state: AdminAlarmState;
  stateUpdatedAt: string | null;
  /**
   * CloudWatch's own reason string, truncated server-side.
   *
   * Safe by construction — generated from metric math ("1 datapoint [12.0] was
   * greater than the threshold (10.0)"), so it carries counts, never user data.
   * It exists ONLY in this payload, behind the #79 identity gate: the alert
   * EMAIL deliberately carries no upstream text at all. Render it as TEXT.
   */
  stateReason: string | null;
  lastNotifiedAt: string | null;
}

/** The email half's current posture, so the banner can explain itself. */
export interface AdminAlertEmailDelivery {
  status: AdminAlertEmailStatus;
  /** Convenience mirror of `status === Sending`. */
  enabled: boolean;
  /**
   * How many ACTIVE platform admins would be emailed right now — derived from
   * `platform_admins` at read time, never a configured list. ZERO IS WORTH
   * SURFACING even when armed: an alerter with no recipients is silently
   * useless, which is the failure mode nobody notices until an incident.
   */
  recipientCount: number;
}

export interface AdminAlertState {
  /** `config.observedEnvironment` — matches the dashboard's env badge. */
  environment: string;
  /**
   * Whether the CloudWatch read succeeded at all. `Unconfigured` = no alarm
   * prefix wired (Terraform supplies it); `Unavailable` = the call failed.
   * Fail-open both ways — the endpoint never 500s (#116). Neither licenses
   * rendering "all clear".
   */
  status: ObservabilitySourceStatus;
  /** The `pool-<env>` prefix the alarm names were built from, if configured. */
  alarmPrefix: string | null;
  /** How many watched alarms are in ALARM right now — the banner's trigger. */
  criticalCount: number;
  alarms: AdminAlertSummary[];
  email: AdminAlertEmailDelivery;
}

// ─── #158 moderation queue (source: safety.types.ts + safety.schema.ts) ──────
// The store-review gate's third requirement: demonstrable ACTION on reports.
// Every one of these endpoints is in the IDENTITY-GATED half of /admin (#79) —
// never the m2m token — because this surface reads user message content and can
// redact it, so each decision must be attributable to a named founder.

/** What a report is about. Determines what got snapshotted (founder decision D2). */
export enum ReportTargetType {
  /** One message. `targetId` is a message id — the only redactable target. */
  Message = 'MESSAGE',
  /** A whole thread. `targetId` is a conversation id. */
  Conversation = 'CONVERSATION',
  /** A person, with no specific message attached. `targetId` is a user id. */
  User = 'USER',
}

/** Why the reporter reported. A CLOSED set — `Other` is the escape hatch. */
export enum ReportReason {
  Spam = 'SPAM',
  Harassment = 'HARASSMENT',
  HateSpeech = 'HATE_SPEECH',
  SexualContent = 'SEXUAL_CONTENT',
  ScamOrFraud = 'SCAM_OR_FRAUD',
  ViolenceOrThreats = 'VIOLENCE_OR_THREATS',
  SelfHarm = 'SELF_HARM',
  Impersonation = 'IMPERSONATION',
  Other = 'OTHER',
}

/**
 * Where a report is in the triage pipeline. `Open` and `Reviewing` are both
 * UNRESOLVED — the API's `openCount` is the sum of the two.
 */
export enum ReportStatus {
  Open = 'OPEN',
  Reviewing = 'REVIEWING',
  /** Terminal — a moderation action was taken. */
  Actioned = 'ACTIONED',
  /** Terminal — reviewed and found not to warrant action. */
  Dismissed = 'DISMISSED',
}

/**
 * What the reviewing admin actually did.
 *
 * `ContentRemoved` is the ONLY value this surface PERFORMS: it sets
 * `Message.deletedAt` (D9) in the same transaction as the review, and the API
 * 400s if the report's target is not a MESSAGE. `UserSuspended` / `UserWarned`
 * are RECORDED here and carried out elsewhere — suspension is the existing #83
 * `POST /admin/users/:id/suspend`, which opens its own transaction and has its
 * own audit action. The UI links out to it rather than duplicating the call.
 */
export enum ReportAction {
  None = 'NONE',
  ContentRemoved = 'CONTENT_REMOVED',
  UserWarned = 'USER_WARNED',
  UserSuspended = 'USER_SUSPENDED',
}

/** One row of the moderation queue. */
export interface AdminReportSummary {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  status: ReportStatus;
  action: ReportAction;
  reporterId: string;
  /** The account reported; null when the report could not be attributed. */
  reportedUserId: string | null;
  /**
   * Identity SNAPSHOTTED at report time — survives `deleteMe` anonymization, so
   * a report against a departed account still shows a name, not a UUID.
   */
  reportedUserDisplayName: string | null;
  reportedUserHandle: string | null;
  conversationId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
}

/**
 * A queue row plus the evidence.
 *
 * ⚠️ `details`, `contentSnapshot` and `reviewerNotes` are USER-AUTHORED FREE
 * TEXT (the #116 L3/L4 rule applies at full strength here — this is literally
 * reported abusive content). Render them as TEXT CHILDREN only: never
 * `dangerouslySetInnerHTML`, never an `href`, never a `src`.
 */
export interface AdminReportDetail extends AdminReportSummary {
  details: string | null;
  /**
   * The D2 evidence copy, taken at report time and stored ON THE REPORT ROW —
   * which is why it still exists after the sender deleted their account
   * (hard-deleting their messages) or after a previous review redacted it. It
   * is a FROZEN copy, never live content, and the UI must say so.
   */
  contentSnapshot: string | null;
  /** Internal-only. Never shown to the reporter or the reported user. */
  reviewerNotes: string | null;
}

export interface AdminReportListResponse {
  items: AdminReportSummary[];
  nextCursor: string | null;
  /** Unresolved (`Open` + `Reviewing`) count — the queue badge. */
  openCount: number;
}

/** Body of `POST /admin/reports/:id/review` (adminReviewReportSchema). */
export interface AdminReviewReportInput {
  /** Required — a review that does not move the report is not a review. */
  status: ReportStatus;
  /** Defaults to `None` server-side, so dismissing needs no extra field. */
  action?: ReportAction;
  notes?: string;
}

// ─── #720 in-app feedback inbox (source: feedback.types.ts) ──────────────────
// Mirrored byte for byte from poolmobile `packages/shared/src/types/
// feedback.types.ts`. Identity-gated like the moderation queue: every status
// move is attributed to a named founder and audited server-side.

/** Where in the app the feedback is about. Coarse on purpose — `screen` is exact. */
export enum FeedbackArea {
  Home = 'HOME',
  Pools = 'POOLS',
  LogExpense = 'LOG_EXPENSE',
  SettleUp = 'SETTLE_UP',
  Discover = 'DISCOVER',
  Messages = 'MESSAGES',
  PoolPoints = 'POOL_POINTS',
  ProfileSettings = 'PROFILE_SETTINGS',
  Other = 'OTHER',
}

export enum FeedbackKind {
  Broken = 'BROKEN',
  HardToUse = 'HARD_TO_USE',
  LooksOff = 'LOOKS_OFF',
  MissingFeature = 'MISSING_FEATURE',
  Other = 'OTHER',
}

/** The team's triage state. Not a ratchet — any move is allowed, and audited. */
export enum FeedbackStatus {
  New = 'NEW',
  Triaged = 'TRIAGED',
  Fixed = 'FIXED',
}

/**
 * Build/device facts the app attaches on its own. Bounded server-side, but
 * still CLIENT-SUPPLIED strings — render as TEXT only, like `text`.
 */
export interface FeedbackContext {
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
  buildNumber?: string;
  /** `expo-updates`' running update id — which OTA the user is on. */
  updateId?: string;
  runtimeVersion?: string;
  osVersion?: string;
  locale?: string;
  /** The navigation route name the user came from. */
  screen?: string;
}

/**
 * One row of the Feedback tab.
 *
 * ⚠️ `text` is USER-AUTHORED FREE TEXT (the #116 L3/L4 rule): TEXT children
 * only — never `dangerouslySetInnerHTML`, never markdown, never an `href`/`src`.
 */
export interface AdminFeedbackItem {
  id: string;
  userId: string;
  /** Live identity at read time; null once the account is gone. */
  userDisplayName: string | null;
  userHandle: string | null;
  area: FeedbackArea;
  kind: FeedbackKind;
  status: FeedbackStatus;
  /** Null when the user skipped the optional text. */
  text: string | null;
  context: FeedbackContext;
  createdAt: string;
  statusChangedAt: string | null;
  statusChangedById: string | null;
}

export interface AdminFeedbackListResponse {
  items: AdminFeedbackItem[];
  /** OPAQUE (`<createdAt ISO>_<uuid>` today) — pass back verbatim, never parse. */
  nextCursor: string | null;
  /** Rows still `NEW`, across EVERY filter — not just the current page. */
  newCount: number;
}

// ─── #313 force-update gate (poolmobile #590) ────────────────────────────────
//
// Hand-copied from `packages/shared/src/types/app-version.types.ts` and
// `constants/app-version.constants.ts`, the same arrangement every other DTO in
// this file uses — this app is a pure REST client and shares no build with the
// API.

/** The platform a binary was built for. */
export enum AppPlatform {
  Ios = 'ios',
  Android = 'android',
}

/**
 * One platform's requirement as the admin surface sees it.
 *
 * `minimumVersion: null` means NO MINIMUM IS SET — the ordinary state, the one
 * every environment starts in. It is not `0.0.0` and it is not an error.
 */
export interface AppVersionRequirementRecord {
  platform: AppPlatform;
  minimumVersion: string | null;
  updatedAt: string;
  /** The platform admin who last set it. Null for a row that predates any set. */
  updatedById: string | null;
}

/** Body of `PUT /admin/app/requirements`. `null` clears. */
export interface SetAppVersionRequirementBody {
  platform: AppPlatform;
  minimumVersion: string | null;
}

/**
 * What the API will accept as a minimum — a plain dotted store version.
 *
 * ⚠️ MIRRORED from `APP_VERSION_MINIMUM_PATTERN`, and it is a COURTESY, not the
 * guard: the API validates with its own copy and a hand-written CHECK
 * constraint makes an unrankable minimum UNSTORABLE. This exists only so the
 * form can refuse before a round trip. If the two ever disagree, the API wins.
 */
export const APP_VERSION_MINIMUM_PATTERN = /^\d{1,9}(\.\d{1,9}){0,3}$/;

// ─── Impersonation, "view as" (#84, over poolmobile #590) ────────────────────
// Hand-copied from `packages/shared/src/types/impersonation.types.ts` and
// `constants/impersonation.constants.ts` (keep in sync). The API mints, lists
// and revokes short-lived READ-ONLY tokens that render the product as one user.

/**
 * Session TTL, MIRRORED from `IMPERSONATION.TTL_MINUTES` for copy only — the
 * authoritative TTL is baked into the token's `exp` AND the session row, and
 * the start response echoes it (`ttlMinutes`) so the countdown cannot drift.
 */
export const IMPERSONATION_TTL_MINUTES = 15;

/**
 * Reason bounds, MIRRORED from `IMPERSONATION.MIN/MAX_REASON_LENGTH`. A
 * COURTESY, not the guard — the API's Zod schema is the authority; these exist
 * so the form can refuse before a round trip. If they disagree, the API wins.
 */
export const IMPERSONATION_MIN_REASON_LENGTH = 10;
export const IMPERSONATION_MAX_REASON_LENGTH = 280;

/**
 * Lifecycle state, DERIVED server-side at read time from `endedAt`/`expiresAt`.
 * There is no stored status column and no sweeper: expiry is a property of the
 * row. The dashboard may additionally show a locally-elapsed active session as
 * expired once its countdown hits zero — the server would answer the same.
 */
export enum ImpersonationSessionStatus {
  Active = 'active',
  Expired = 'expired',
  Ended = 'ended',
}

/** Why a session stopped being usable (written only on the explicit end). */
export enum ImpersonationEndReason {
  /** The impersonating admin ended their own session. */
  AdminEnded = 'admin_ended',
  /** A DIFFERENT platform admin ended someone else's live session. */
  RevokedByAdmin = 'revoked_by_admin',
  /** Ended after `expiresAt` — the TTL had already killed the token. */
  Expired = 'expired',
}

/** One impersonation session as this dashboard renders it. */
export interface ImpersonationSessionSummary {
  id: string;
  status: ImpersonationSessionStatus;
  adminUserId: string;
  /** Nullable — an account can exist mid-signup. Fall back to the id. */
  adminEmail: string | null;
  adminDisplayName: string | null;
  targetUserId: string;
  targetEmail: string | null;
  targetDisplayName: string | null;
  /** The support justification typed by the admin at start. Never optional. */
  reason: string;
  createdAt: string;
  expiresAt: string;
  endedAt: string | null;
  endedById: string | null;
  endReason: ImpersonationEndReason | null;
}

/**
 * Inner `data` of `POST /admin/impersonation/sessions`.
 *
 * ⚠️ `impersonationToken` is returned EXACTLY ONCE, here. The server stores
 * only the session id it carries, so it can never be re-read, re-issued or
 * recovered — losing it means ending this session and starting a new
 * (separately audited) one. The dashboard must hold it in dialog-local state
 * only: never a cookie, never localStorage, never state that outlives the
 * dialog.
 */
export interface StartImpersonationResponse {
  session: ImpersonationSessionSummary;
  /** Bearer for the MOBILE API as the target user. Read-only, short-lived. */
  impersonationToken: string;
  expiresAt: string;
  /** TTL echoed by the server so the countdown cannot drift from it. */
  ttlMinutes: number;
}

/** Inner `data` of `GET /admin/impersonation/sessions`. */
export interface ImpersonationSessionListResponse {
  sessions: ImpersonationSessionSummary[];
}

/** Inner `data` of `POST /admin/impersonation/sessions/:id/end`. */
export interface EndImpersonationResponse {
  session: ImpersonationSessionSummary;
}
