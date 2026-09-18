/**
 * Fixture payloads for the OFFLINE Stats specs (poolweb #33).
 *
 * ⚠️ WHY FIXTURES EXIST AT ALL, GIVEN THE SUITE TALKS TO STAGING. Two reasons,
 * and neither is "staging is inconvenient":
 *
 *  1. **Staging's numbers are whatever staging happens to hold.** A delta of
 *     "+25% (+5)" cannot be asserted against live data, so the one piece of
 *     arithmetic this page does — current vs previous window — would go
 *     untested on the surface that exists to show it. Here the inputs are
 *     known, so the rendered delta is checkable.
 *  2. **The states that matter most never occur on a healthy environment.** A
 *     panel whose call FAILED, and a payload from an API older than #624, are
 *     exactly the cases the page's honesty rules are written for — and exactly
 *     the ones a green staging can never produce.
 *
 * These are hand-copied from poolmobile's `@pool/shared` like every other DTO
 * in this repo (`lib/admin/types.ts` names the files). They are SHAPES, not
 * data: no real user, pool or amount appears here.
 */

/** The API envelope every admin response is wrapped in. */
export function envelope<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

const WINDOW = { days: 30, since: '2026-08-19T00:00:00.000Z' };
const PREVIOUS_WINDOW = {
  since: '2026-07-20T00:00:00.000Z',
  until: '2026-08-19T00:00:00.000Z',
};

/** Signups: 25 this window against 20 before it — a checkable "+25% (+5)". */
export const SIGNUPS = {
  window: WINDOW,
  totalInWindow: 25,
  totalAllTime: 412,
  series: [
    { date: '2026-09-15', signups: 4, cumulative: 16 },
    { date: '2026-09-16', signups: 6, cumulative: 22 },
    { date: '2026-09-17', signups: 3, cumulative: 25 },
  ],
  previousWindow: PREVIOUS_WINDOW,
  previousTotalInWindow: 20,
};

export const ACTIVE_USERS = {
  asOf: '2026-09-18T08:00:00.000Z',
  dau: 12,
  wau: 44,
  mau: 96,
  lastSeenDistribution: [
    { bucket: 'today', count: 12 },
    { bucket: '1-7d', count: 32 },
    { bucket: '8-30d', count: 52 },
    { bucket: '31-90d', count: 9 },
    { bucket: '90d+', count: 3 },
  ],
};

export const ACTIVATION = {
  window: WINDOW,
  totalUsers: 400,
  activatedAllTime: 300,
  activationRateAllTime: 0.75,
  signupsInWindow: 24,
  activatedInWindow: 18,
  activationRateInWindow: 0.75,
  blockedByRequirement: { AGE: 4, USERNAME: 2, IDENTITY: 1 },
  previousWindow: PREVIOUS_WINDOW,
  previousSignupsInWindow: 20,
  previousActivatedInWindow: 12,
  previousActivationRateInWindow: 0.6,
};

export const POOLS = {
  total: 33,
  // The server seeds EVERY `PoolType` to zero, so a real payload always carries
  // all of them — including the ones nobody has used.
  byType: { trip: 12, house: 21, event: 0 },
  byVisibility: { PUBLIC: 20, PRIVATE: 13 },
  byStatus: { ACTIVE: 25, CLOSED: 6, ARCHIVED: 2 },
  newPoolsSeries: [
    { date: '2026-09-16', count: 2 },
    { date: '2026-09-17', count: 5 },
  ],
  window: WINDOW,
  suspended: 3,
  byCategory: { food_drink: 9, travel: 7, sports: 5, uncategorized: 12 },
  byMemberCount: [
    { bucket: '0', count: 1 },
    { bucket: '1', count: 4 },
    { bucket: '2-3', count: 12 },
    { bucket: '4-6', count: 10 },
    { bucket: '7-10', count: 4 },
    { bucket: '11-20', count: 2 },
    { bucket: '21+', count: 0 },
  ],
  newPoolsByVisibilitySeries: [
    { date: '2026-09-16', public: 1, private: 1 },
    { date: '2026-09-17', public: 4, private: 1 },
  ],
  newInWindow: 7,
  previousWindow: PREVIOUS_WINDOW,
  previousNewInWindow: 7,
};

export const TRANSACTIONS = {
  total: 180,
  // ⚠️ The PRISMA values. The server seeds this from `TransactionStatus` in
  // `@prisma/client`, not from the lowercase enum in the shared package — a
  // fixture carrying the wrong casing made a real colour bug untestable.
  byStatus: { COMPLETED: 150, PENDING: 25, DECLINED: 5 },
  series: [
    { date: '2026-09-16', count: 7 },
    { date: '2026-09-17', count: 11 },
  ],
  window: WINDOW,
  totalInWindow: 40,
  settlementsByStatus: { CONFIRMED: 30, PENDING: 8, REJECTED: 2 },
  settlementsInWindow: 15,
  depositsInWindow: 9,
  previousWindow: PREVIOUS_WINDOW,
  previousTotalInWindow: 50,
  previousSettlementsInWindow: 10,
  previousDepositsInWindow: 12,
};

export const ENGAGEMENT = {
  points: {
    basis: 'pointBalance' as const,
    buckets: [
      { bucket: '0', count: 40 },
      { bucket: '1-99', count: 120 },
      { bucket: '100-499', count: 60 },
      { bucket: '500-999', count: 12 },
      { bucket: '1000+', count: 3 },
    ],
    totalUsers: 235,
  },
  streak: {
    current: [
      { bucket: '0', count: 100 },
      { bucket: '1-3', count: 70 },
      { bucket: '4-7', count: 40 },
      { bucket: '8-30', count: 20 },
      { bucket: '31+', count: 5 },
    ],
    longestMax: 47,
  },
};

export const POINTS = {
  windowDays: 30,
  byReason: [
    { reason: 'expense_logged', awards: 120, points: 360, distinctEarners: 22 },
    { reason: 'daily_login', awards: 200, points: 200, distinctEarners: 31 },
    // A rule nobody reached — reported as a zero row since #624, never omitted.
    { reason: 'leaderboard_champion', awards: 0, points: 0, distinctEarners: 0 },
  ],
  totals: { awards: 320, points: 560, distinctEarners: 35 },
  previousWindow: PREVIOUS_WINDOW,
  previousTotals: { awards: 280, points: 400, distinctEarners: 30 },
  daily: {
    medianPerEarnerPerDay: 4,
    p90PerEarnerPerDay: 12,
    grindableCapHitRate: 0.02,
    earnerDays: 610,
  },
};

function funnel(stages: [string, number][]) {
  const top = stages[0]?.[1] ?? 0;
  return {
    since: WINDOW.since,
    windowDays: 30,
    stageOrder: stages.map(([name]) => name),
    buckets: [],
    totals: stages.map(([name, actors]) => ({ name, actors, events: actors })),
    conversionRates: Object.fromEntries(
      stages.map(([name, actors]) => [name, top === 0 ? 0 : actors / top]),
    ),
  };
}

export const AUTH_FUNNEL = funnel([
  ['signup_started', 100],
  ['otp_verified', 70],
  ['onboarding_completed', 55],
]);

export const POOL_FUNNEL = {
  create: funnel([
    ['pool_create_started', 40],
    ['pool_created', 28],
  ]),
  join: funnel([
    ['pool_invite_opened', 60],
    ['pool_joined', 41],
  ]),
};

export const DISCOVER_FUNNEL = funnel([
  ['discover_opened', 80],
  ['discover_pool_viewed', 35],
]);

export const MONEY_EVENTS = {
  since: WINDOW.since,
  windowDays: 30,
  events: ['deposit_completed', 'expense_logged'],
  buckets: [],
  totals: { deposit_completed: 21, expense_logged: 64 },
};

/**
 * Geography (#624). ⚠️ Note `amman||JO` — a TWO-segment legacy key with no
 * region. Those are published exactly as stored and must stay filterable, which
 * is the reason nothing in this repo normalizes a key.
 */
export const GEOGRAPHY = {
  window: WINDOW,
  cities: [
    {
      key: 'columbia|MO|US',
      display: 'Columbia, MO',
      regionCode: 'MO',
      countryCode: 'US',
      userCount: 18,
      poolCount: 6,
      newUserCount: 4,
      newPoolCount: 1,
      lat: 38.95,
      lng: -92.33,
      centroidSource: 'curated',
    },
    {
      key: 'austin|TX|US',
      display: 'Austin, TX',
      regionCode: 'TX',
      countryCode: 'US',
      userCount: 7,
      poolCount: 9,
      newUserCount: 2,
      newPoolCount: 3,
      lat: 30.27,
      lng: -97.74,
      centroidSource: 'pools',
    },
    {
      key: 'amman||JO',
      display: 'Amman',
      regionCode: null,
      countryCode: 'JO',
      userCount: 5,
      poolCount: 0,
      newUserCount: 1,
      newPoolCount: 0,
      lat: null,
      lng: null,
      centroidSource: null,
    },
  ],
  citiesTruncated: false,
  countries: [
    { countryCode: 'US', userCount: 25, poolCount: 15, cityCount: 2 },
    { countryCode: 'JO', userCount: 5, poolCount: 0, cityCount: 1 },
  ],
  regions: [
    { countryCode: 'US', regionCode: 'MO', regionName: 'Missouri', userCount: 18, poolCount: 6, cityCount: 1 },
    { countryCode: 'US', regionCode: 'TX', regionName: 'Texas', userCount: 7, poolCount: 9, cityCount: 1 },
  ],
  usersWithoutCity: 11,
  poolsWithoutCity: 3,
  exactVenuePools: [
    { id: 'pool-1', name: 'Thursday football', lat: 38.94, lng: -92.32, venueAddress: '1 Field Rd' },
  ],
  exactVenuePoolsTruncated: false,
};

/** A user list row, for the city-filter specs. */
export function userRow(over: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'someone@example.com',
    username: 'someone',
    displayName: 'Someone',
    firstName: 'Some',
    lastName: 'One',
    isSuspended: false,
    deletedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    locationCity: 'Columbia, MO',
    locationCityKey: 'columbia|MO|US',
    ...over,
  };
}

export const USERS_LIST = { users: [userRow()], total: 1, limit: 25, offset: 0 };

export const ALERTS = {
  status: 'ok',
  criticalCount: 0,
  alarms: [
    { key: 'BalanceDrift', label: 'Balance drift', description: 'Ledger drift detected', state: 'ok' },
    { key: 'Server5xx', label: 'Server errors', description: '5xx responses', state: 'ok' },
  ],
  email: { status: 'environment_not_eligible', recipientCount: 0 },
};

/**
 * A pre-#624 payload — the SAME endpoints as an API that predates the widening.
 * Every `previous…` twin and every new distribution is simply absent, which is
 * what the #112 switch can point the page at.
 */
export const LEGACY_POOLS = {
  total: POOLS.total,
  byType: POOLS.byType,
  byVisibility: POOLS.byVisibility,
  byStatus: POOLS.byStatus,
  newPoolsSeries: POOLS.newPoolsSeries,
};

export const LEGACY_SIGNUPS = {
  window: WINDOW,
  totalInWindow: SIGNUPS.totalInWindow,
  totalAllTime: SIGNUPS.totalAllTime,
  series: SIGNUPS.series,
};

/** Path suffix → payload, for the happy-path route handler. */
export const STATS_ROUTES: Record<string, unknown> = {
  'metrics/active-users': ACTIVE_USERS,
  'metrics/signups': SIGNUPS,
  'metrics/activation': ACTIVATION,
  'metrics/pools': POOLS,
  'metrics/transactions': TRANSACTIONS,
  'metrics/engagement': ENGAGEMENT,
  'metrics/points': POINTS,
  'analytics/funnels/auth': AUTH_FUNNEL,
  'analytics/funnels/pool': POOL_FUNNEL,
  'analytics/funnels/discover': DISCOVER_FUNNEL,
  'analytics/money-events': MONEY_EVENTS,
  'metrics/geography': GEOGRAPHY,
  'observability/alerts': ALERTS,
};
