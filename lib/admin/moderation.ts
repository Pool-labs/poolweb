/**
 * Moderation-queue display layer (poolmobile #158, web issue #13).
 *
 * Vocabulary, bounds and the published turnaround commitment are MIRRORED from
 * `@pool/shared` (`constants/safety.constants.ts`) exactly as
 * `lib/admin/observability.ts` mirrors the observability constants — this repo
 * is a pure REST client and cannot import the poolmobile workspace.
 *
 * ⚠️ SOURCE OF TRUTH for everything in this file:
 *   poolmobile `packages/shared/src/constants/safety.constants.ts`
 *   poolmobile `packages/shared/src/types/safety.types.ts`
 * The admin report DTOs deliberately do NOT carry the turnaround numbers (only
 * the reporter-facing `ReportReceipt` does), so the SLA constants are mirrored
 * here rather than read off a response. The API re-validates every bound it
 * accepts with Zod, so a drift degrades to a 400, never to a bad write.
 *
 * Everything here is PURE and client-safe: no fetching, no `Date.now()` — the
 * caller passes `now`, so a countdown ticks from one clock the whole page
 * shares and the SLA math is trivially checkable.
 */

import { ReportAction, ReportReason, ReportStatus, ReportTargetType } from './types';

/**
 * THE PUBLISHED TURNAROUND COMMITMENT.
 *
 * Triage within 24 hours, resolution within 72 — stated in poolmobile's
 * `BUSINESS-RULES.md` → In-app messaging → Safety, echoed to every reporter in
 * their `ReportReceipt`, and shown to a store reviewer as the evidence that
 * reports get acted on. This queue exists to hold it, so these two numbers are
 * the only thing on the page that ranks the work.
 */
export const REPORT_TURNAROUND = {
  TRIAGE_HOURS: 24,
  RESOLUTION_HOURS: 72,
} as const;

/** Mirror of `REPORT_PAGE_SIZE`. The API clamps to MAX regardless. */
export const REPORT_PAGE_SIZE = {
  DEFAULT: 30,
  MAX: 100,
} as const;

/** Mirror of `REPORT_REVIEWER_NOTES_MAX_LENGTH`. Internal-only text. */
export const REPORT_REVIEWER_NOTES_MAX_LENGTH = 2000;

/** Reason → the same words the reporter picked (mirror of `REPORT_REASON_LABELS`). */
export const REPORT_REASON_LABELS: Readonly<Record<ReportReason, string>> = {
  [ReportReason.Spam]: 'Spam',
  [ReportReason.Harassment]: 'Harassment or bullying',
  [ReportReason.HateSpeech]: 'Hate speech',
  [ReportReason.SexualContent]: 'Sexual content',
  [ReportReason.ScamOrFraud]: 'Scam or fraud',
  [ReportReason.ViolenceOrThreats]: 'Violence or threats',
  [ReportReason.SelfHarm]: 'Self-harm',
  [ReportReason.Impersonation]: 'Impersonation',
  [ReportReason.Other]: 'Something else',
};

export const REPORT_TARGET_LABELS: Readonly<Record<ReportTargetType, string>> = {
  [ReportTargetType.Message]: 'Message',
  [ReportTargetType.Conversation]: 'Conversation',
  [ReportTargetType.User]: 'User',
};

export const REPORT_STATUS_LABELS: Readonly<Record<ReportStatus, string>> = {
  [ReportStatus.Open]: 'Open',
  [ReportStatus.Reviewing]: 'Reviewing',
  [ReportStatus.Actioned]: 'Actioned',
  [ReportStatus.Dismissed]: 'Dismissed',
};

export const REPORT_ACTION_LABELS: Readonly<Record<ReportAction, string>> = {
  [ReportAction.None]: 'No action',
  [ReportAction.ContentRemoved]: 'Content removed',
  [ReportAction.UserWarned]: 'User warned',
  [ReportAction.UserSuspended]: 'User suspended',
};

/**
 * The order the status filter offers, unresolved first — the queue's whole
 * point is the work that is still outstanding.
 */
export const REPORT_STATUS_ORDER: readonly ReportStatus[] = [
  ReportStatus.Open,
  ReportStatus.Reviewing,
  ReportStatus.Actioned,
  ReportStatus.Dismissed,
];

/** Actions the review form offers, in escalation order. */
export const REPORT_ACTION_ORDER: readonly ReportAction[] = [
  ReportAction.None,
  ReportAction.ContentRemoved,
  ReportAction.UserWarned,
  ReportAction.UserSuspended,
];

/** `Open` + `Reviewing` — the two statuses the API's `openCount` sums. */
export function isUnresolved(status: ReportStatus): boolean {
  return status === ReportStatus.Open || status === ReportStatus.Reviewing;
}

/** `Actioned` + `Dismissed` — the two terminal states. */
export function isTerminal(status: ReportStatus): boolean {
  return !isUnresolved(status);
}

/**
 * Content removal is a MESSAGE-only action, and the API enforces it (400
 * otherwise): there is no bulk redaction of a thread, and "remove content"
 * against a USER target has no defined meaning. Mirrored here so the option is
 * disabled with an explanation instead of failing after the click.
 */
export function canRemoveContent(targetType: ReportTargetType): boolean {
  return targetType === ReportTargetType.Message;
}

/**
 * `UserSuspended` is RECORDED by a review and carried out somewhere else — the
 * existing #83 `POST /admin/users/:id/suspend`, which opens its own
 * transaction, writes its own audit action and refuses to suspend a platform
 * admin. The dashboard links to the user's page rather than duplicating that
 * call, matching the server's delegate-don't-reimplement design.
 */
export function isDelegatedAction(action: ReportAction): boolean {
  return action === ReportAction.UserSuspended || action === ReportAction.UserWarned;
}

const HOUR_MS = 60 * 60 * 1000;

/** Which clock a report is currently being measured against. */
export enum SlaMilestone {
  Triage = 'TRIAGE',
  Resolution = 'RESOLUTION',
}

export const SLA_MILESTONE_LABELS: Readonly<Record<SlaMilestone, string>> = {
  [SlaMilestone.Triage]: `Triage (${REPORT_TURNAROUND.TRIAGE_HOURS}h)`,
  [SlaMilestone.Resolution]: `Resolution (${REPORT_TURNAROUND.RESOLUTION_HOURS}h)`,
};

export interface ReportSla {
  /** The clock still running, or null once the report reached a terminal state. */
  milestone: SlaMilestone | null;
  /** When the running clock expires (ms epoch); null when nothing is running. */
  dueAt: number | null;
  /** Time left on the running clock; NEGATIVE means already overdue. */
  msRemaining: number | null;
  /** True when the running clock is past due. */
  breached: boolean;
  /** True when triage happened late, or is late right now. */
  triageBreached: boolean;
  /** True when resolution happened late, or is late right now. */
  resolutionBreached: boolean;
}

/**
 * Where one report stands against the published commitment.
 *
 * Measured exactly as the server documents it (`admin-reports.service.ts`):
 * TRIAGE is the transition OUT of `Open`, RESOLUTION is the transition INTO a
 * terminal state, and both deadlines run from `createdAt` — the moment the
 * reporter was promised a turnaround, not the moment anyone looked.
 *
 * A review stamps `reviewedAt` on every transition, so a report sitting in
 * `Reviewing` has been triaged at `reviewedAt` and is still on the resolution
 * clock. `now` is passed in so a page ticks from one shared clock.
 */
export function reportSla(
  report: { createdAt: string; status: ReportStatus; reviewedAt: string | null },
  now: number,
): ReportSla {
  const created = new Date(report.createdAt).getTime();

  // An unparseable timestamp must not silently render as "on time" — with no
  // clock to measure, nothing is claimed in either direction.
  if (Number.isNaN(created)) {
    return {
      milestone: null,
      dueAt: null,
      msRemaining: null,
      breached: false,
      triageBreached: false,
      resolutionBreached: false,
    };
  }

  const triageDue = created + REPORT_TURNAROUND.TRIAGE_HOURS * HOUR_MS;
  const resolutionDue = created + REPORT_TURNAROUND.RESOLUTION_HOURS * HOUR_MS;

  const reviewed = report.reviewedAt ? new Date(report.reviewedAt).getTime() : NaN;
  const reviewedAt = Number.isNaN(reviewed) ? null : reviewed;

  const triagedAt = report.status === ReportStatus.Open ? null : reviewedAt;
  const resolvedAt = isTerminal(report.status) ? reviewedAt : null;

  // A triaged-but-unstamped report (status moved, timestamp unreadable) is
  // treated as triaged NOW rather than as still-open: the status is the fact,
  // the timestamp is only the detail.
  const triaged = report.status !== ReportStatus.Open;
  const resolved = isTerminal(report.status);

  const triageBreached = triaged ? (triagedAt ?? now) > triageDue : now > triageDue;
  const resolutionBreached = resolved ? (resolvedAt ?? now) > resolutionDue : now > resolutionDue;

  if (resolved) {
    return {
      milestone: null,
      dueAt: null,
      msRemaining: null,
      breached: false,
      triageBreached,
      resolutionBreached,
    };
  }

  const milestone = triaged ? SlaMilestone.Resolution : SlaMilestone.Triage;
  const dueAt = triaged ? resolutionDue : triageDue;

  return {
    milestone,
    dueAt,
    msRemaining: dueAt - now,
    breached: now > dueAt,
    triageBreached,
    resolutionBreached,
  };
}

/**
 * "3h 12m" / "2d 4h". Coarse on purpose — an SLA measured in days does not need
 * seconds, and a ticking second-hand invites watching the clock instead of the
 * queue.
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(Math.abs(ms) / 60000));
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const minutes = total % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** How long a report has been open, for the queue's "Age" column. */
export function formatAge(createdAt: string, now: number): string {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return '—';
  return formatDuration(now - created);
}

/** The countdown string for a running clock: "3h 12m left" / "overdue by 5h 1m". */
export function formatSlaCountdown(sla: ReportSla): string {
  if (sla.msRemaining === null) return '—';
  return sla.breached
    ? `overdue by ${formatDuration(sla.msRemaining)}`
    : `${formatDuration(sla.msRemaining)} left`;
}

/** How urgent the running clock is — drives the badge tone, nothing else. */
export type SlaTone = 'breached' | 'due-soon' | 'on-track' | 'done';

/** Inside this much of the deadline, the badge warns. */
export const SLA_DUE_SOON_MS = 4 * HOUR_MS;

export function slaTone(sla: ReportSla): SlaTone {
  if (sla.milestone === null) {
    // Resolved. It still says whether the commitment was actually met — a
    // breach that disappears the moment it is closed teaches nothing.
    return sla.triageBreached || sla.resolutionBreached ? 'breached' : 'done';
  }
  if (sla.breached) return 'breached';
  if (sla.msRemaining !== null && sla.msRemaining <= SLA_DUE_SOON_MS) return 'due-soon';
  return 'on-track';
}
