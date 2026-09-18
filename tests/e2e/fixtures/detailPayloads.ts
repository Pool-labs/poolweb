/**
 * Full detail payloads in the WIDENED shape (poolweb#31 over poolmobile#618,
 * flattened by #623), for the offline detail specs.
 *
 * ⚠️ THE FLAT NAMES ARE THE CONTRACT, AND THAT IS THE WHOLE POINT OF THIS FILE.
 * #618's first cut shipped a GROUPED payload (`user.location.locationCity`)
 * while this dashboard reads flat names — and the live page answered "not
 * reported by this API version" on every section, silently, because every
 * field it looked for was simply absent. #623 flattened the server to match.
 * These fixtures are the flat shape, so a future regression on either side
 * fails a test here instead of blanking the page for a founder.
 *
 * The sibling `admin/detail-rich.spec.ts` widens a REAL staging response in
 * flight; this serves the whole thing, so the same assertions run with no
 * session and no environment.
 */

export const USER_DETAIL = {
  id: '00000000-0000-4000-8000-0000000000u1',
  email: 'tester@example.com',
  username: 'tester',
  displayName: 'E2E Tester',
  firstName: 'E2E',
  lastName: 'Tester',
  isSuspended: false,
  deletedAt: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-09-12T08:30:00.000Z',
  featureFlags: { experimental: false },
  isPlatformAdmin: false,
  poolCount: 1,
  membership: { owner: 1, admin: 0, member: 0 },

  // ── #618 location: country + region derive from the KEY, never the coords ──
  locationCity: 'Columbia, MO, US',
  locationCityKey: 'columbia|mo|us',
  shareLocation: true,
  locationUpdatedAt: '2026-09-01T12:00:00.000Z',
  /** The sensitive tier — its own row, and never used to answer "where". */
  locationLat: 38.9517,
  locationLng: -92.3341,

  dateOfBirth: '2000-04-15T00:00:00.000Z',
  gender: 'FEMALE',
  occupation: 'STUDENT',
  occupationDetail: 'Nursing student',
  lifestyleStatus: 'STUDENT',
  lifestyleDetail: null,
  interests: ['SPORTS', 'FOOD_DRINK'],
  customInterests: ['pickleball'],
  bio: 'Here for the tailgates.',
  isDiscoverable: true,

  lastActivityAt: '2026-09-12T08:30:00.000Z',
  pointBalance: 140,
  lifetimePoints: 260,
  currentStreak: 3,
  longestStreak: 9,

  emailUndeliverableAt: null,
  hasPassword: true,
  identities: [{ provider: 'google', linkedAt: '2026-08-30T10:00:00.000Z' }],
  trustedDeviceCount: 2,
  pushTokenCount: 1,

  paymentHandles: { venmo: '@tester-e2e', cashapp: null, paypal: null, zelle: null, interac: null },
  preferredPaymentProvider: 'VENMO',

  pools: [
    {
      poolId: '00000000-0000-4000-8000-00000000e2e1',
      poolName: 'E2E Tailgate Fund',
      role: 'OWNER',
      joinedAt: '2026-08-20T10:00:00.000Z',
      poolStatus: 'ACTIVE',
      poolVisibility: 'PUBLIC',
    },
  ],

  /** Staging-only markers — the card must exist ONLY when one is present. */
  seedCohort: 'college',
  demoMode: null,
};

export const POOL_DETAIL = {
  id: '00000000-0000-4000-8000-00000000e2e1',
  name: 'E2E Tailgate Fund',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  isSuspended: false,
  deletedAt: null,
  balanceCents: 48_000,
  memberCount: 2,
  creator: {
    id: '00000000-0000-4000-8000-0000000000u1',
    displayName: 'E2E Tester',
    username: 'tester',
    email: 'tester@example.com',
  },
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-09-10T18:00:00.000Z',

  locationCity: 'Toronto, ON, CA',
  locationCityKey: 'toronto|on|ca',
  showExactVenue: true,
  venueAddress: '1 Yonge St',
  locationLat: 43.6426,
  locationLng: -79.3871,

  category: 'Sports & Fitness',
  subcategory: 'Soccer',
  tags: ['SPORTS'],
  customTags: ['sunday-league'],
  rules: 'Members only. Bring your own boots.',
  shortDescription: 'Weekly five-a-side kitty.',

  contributionAmountCents: 2500,
  totalSpentCents: 12_345,
  totalExpenses: 7,
  netAdjustmentsCents: -500,

  seekingMembers: true,
  memberLimit: 12,
  memberLimitMin: 6,
  hideFromGlobalLeaderboards: false,
  lastActivityAt: '2026-09-10T18:00:00.000Z',

  members: [
    {
      userId: '00000000-0000-4000-8000-00000000e2e2',
      displayName: 'E2E Member',
      username: 'e2e_member',
      role: 'ADMIN',
      joinedAt: '2026-08-21T10:00:00.000Z',
    },
  ],

  seedCohort: null,
};

/**
 * The NARROW payload — an API that predates #618 (production did, until its
 * first dispatch). Every widened field is simply absent, which is the state the
 * page's `hasRichUserDetail` / `hasRichPoolDetail` predicates exist for.
 */
export const USER_DETAIL_NARROW = {
  id: USER_DETAIL.id,
  email: USER_DETAIL.email,
  username: USER_DETAIL.username,
  displayName: USER_DETAIL.displayName,
  firstName: USER_DETAIL.firstName,
  lastName: USER_DETAIL.lastName,
  isSuspended: false,
  deletedAt: null,
  createdAt: USER_DETAIL.createdAt,
  updatedAt: USER_DETAIL.updatedAt,
  featureFlags: { experimental: false },
  isPlatformAdmin: false,
  poolCount: 1,
  membership: { owner: 1, admin: 0, member: 0 },
};
