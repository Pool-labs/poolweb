/**
 * Feedback-inbox display layer (poolmobile #720).
 *
 * Labels, orders and bounds are MIRRORED from poolmobile
 * `packages/shared/src/constants/feedback.constants.ts` (and the app's own
 * picker copy) — this repo is a pure REST client and cannot import the
 * workspace. The API re-validates every bound with Zod, so a drift degrades to
 * a 400, never to a bad write.
 *
 * Everything here is PURE and client-safe. It only ever returns strings for
 * React to render as TEXT children — nothing here builds HTML.
 */

import {
  FeedbackArea,
  FeedbackKind,
  FeedbackStatus,
  type AdminFeedbackItem,
  type FeedbackContext,
} from './types';

/** Mirror of `FEEDBACK_PAGE_SIZE`. The API clamps to MAX regardless. */
export const FEEDBACK_PAGE_SIZE = {
  DEFAULT: 30,
  MAX: 100,
} as const;

/** The same words the user picked in the app. */
export const FEEDBACK_AREA_LABELS: Readonly<Record<FeedbackArea, string>> = {
  [FeedbackArea.Home]: 'Home',
  [FeedbackArea.Pools]: 'Pools',
  [FeedbackArea.LogExpense]: 'Log expense',
  [FeedbackArea.SettleUp]: 'Settle up',
  [FeedbackArea.Discover]: 'Discover',
  [FeedbackArea.Messages]: 'Messages',
  [FeedbackArea.PoolPoints]: 'Pool Points',
  [FeedbackArea.ProfileSettings]: 'Profile & settings',
  [FeedbackArea.Other]: 'Something else',
};

export const FEEDBACK_KIND_LABELS: Readonly<Record<FeedbackKind, string>> = {
  [FeedbackKind.Broken]: 'Something’s broken',
  [FeedbackKind.HardToUse]: 'Hard to use',
  [FeedbackKind.LooksOff]: 'Looks off',
  [FeedbackKind.MissingFeature]: 'Missing a feature',
  [FeedbackKind.Other]: 'Other',
};

export const FEEDBACK_STATUS_LABELS: Readonly<Record<FeedbackStatus, string>> = {
  [FeedbackStatus.New]: 'New',
  [FeedbackStatus.Triaged]: 'Triaged',
  [FeedbackStatus.Fixed]: 'Fixed',
};

export const FEEDBACK_AREA_ORDER: readonly FeedbackArea[] = [
  FeedbackArea.Home,
  FeedbackArea.Pools,
  FeedbackArea.LogExpense,
  FeedbackArea.SettleUp,
  FeedbackArea.Discover,
  FeedbackArea.Messages,
  FeedbackArea.PoolPoints,
  FeedbackArea.ProfileSettings,
  FeedbackArea.Other,
];

export const FEEDBACK_KIND_ORDER: readonly FeedbackKind[] = [
  FeedbackKind.Broken,
  FeedbackKind.HardToUse,
  FeedbackKind.LooksOff,
  FeedbackKind.MissingFeature,
  FeedbackKind.Other,
];

/** The triage pipeline, in the order a row moves through it. */
export const FEEDBACK_STATUS_ORDER: readonly FeedbackStatus[] = [
  FeedbackStatus.New,
  FeedbackStatus.Triaged,
  FeedbackStatus.Fixed,
];

const PLATFORM_LABELS: Readonly<Record<FeedbackContext['platform'], string>> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
};

/** How many characters of an OTA update id to show before the ellipsis. */
export const UPDATE_ID_VISIBLE_CHARS = 8;

/** "iOS 18.2" / "Android 34" / "Web". Unknown platform strings pass through as text. */
export function formatPlatform(ctx: FeedbackContext): string {
  const name = PLATFORM_LABELS[ctx.platform] ?? String(ctx.platform);
  return ctx.osVersion ? `${name} ${ctx.osVersion}` : name;
}

/** "v1.0.3 (42)" / "v1.0.3" / "build 42" / null when the app sent neither. */
export function formatAppVersion(ctx: FeedbackContext): string | null {
  if (ctx.appVersion && ctx.buildNumber) return `v${ctx.appVersion} (${ctx.buildNumber})`;
  if (ctx.appVersion) return `v${ctx.appVersion}`;
  if (ctx.buildNumber) return `build ${ctx.buildNumber}`;
  return null;
}

/** First few characters of an OTA id + ellipsis; the caller puts the full id in `title`. */
export function truncateUpdateId(id: string): string {
  return id.length > UPDATE_ID_VISIBLE_CHARS ? `${id.slice(0, UPDATE_ID_VISIBLE_CHARS)}…` : id;
}

/** Display name, then @handle, then a stated absence — never a bare UUID. */
export function feedbackAuthorName(item: AdminFeedbackItem): string {
  return item.userDisplayName || (item.userHandle ? `@${item.userHandle}` : 'Deleted account');
}

/**
 * Keep the header's NEW count honest after an in-place status change without a
 * refetch. `newCount` spans every filter server-side, so the adjustment is the
 * same whatever filter is active. A refresh re-reads the authoritative number.
 */
export function adjustNewCount(
  count: number,
  from: FeedbackStatus,
  to: FeedbackStatus,
): number {
  if (from === to) return count;
  if (from === FeedbackStatus.New) return Math.max(0, count - 1);
  if (to === FeedbackStatus.New) return count + 1;
  return count;
}
