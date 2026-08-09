/**
 * Errors / Health display layer (poolmobile #116).
 *
 * Bounds, defaults and vocabulary are MIRRORED from `@pool/shared`
 * (`constants/observability-feed.constants.ts`) exactly like `lib/admin/types.ts`
 * mirrors the DTOs — this repo is a pure REST client and cannot import the
 * poolmobile workspace. The API re-validates every bound with Zod, so a drift
 * here degrades to a 400, never to an unbounded CloudWatch scan.
 *
 * The "why is this empty" copy lives here rather than in the page so the four
 * `ObservabilitySourceStatus` values are exhaustively answered in ONE place —
 * a panel that renders nothing must always be able to say why.
 */

import {
  AdminAlarmState,
  AdminAlertEmailStatus,
  ObservabilityFeedKind,
  ObservabilitySignal,
  ObservabilitySourceStatus,
  ObservabilityUserSource,
  PinoLevel,
} from './types';

/** Mirror of `OBSERVABILITY_FEED` — only the fields the UI actually needs. */
export const OBSERVABILITY_FEED = {
  DEFAULT_WINDOW_HOURS: 24,
  /** 7 days. A wider window is a slow, billable scan — Sentry does long range. */
  MAX_WINDOW_HOURS: 168,
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 500,
  /** ERROR+FATAL — the same threshold the `ServerErrorCount` alarm counts. */
  DEFAULT_MIN_LEVEL: PinoLevel.Error,
  /** WARN is as low as this surface goes; INFO would be a log browser. */
  MIN_LEVEL_FLOOR: PinoLevel.Warn,
  DEFAULT_MIN_STATUS: 400,
  MIN_STATUS_FLOOR: 400,
} as const;

/** Window options, all within `MAX_WINDOW_HOURS`. */
export const WINDOW_OPTIONS = [1, 6, 24, 72, 168] as const;

export const LIMIT_OPTIONS = [50, 100, 250, 500] as const;

export const MIN_STATUS_OPTIONS = [400, 500] as const;

/** Only levels at or above the floor are offerable. */
export const MIN_LEVEL_OPTIONS = [PinoLevel.Warn, PinoLevel.Error, PinoLevel.Fatal] as const;

export const PINO_LEVEL_LABELS: Readonly<Record<number, string>> = {
  [PinoLevel.Trace]: 'trace',
  [PinoLevel.Debug]: 'debug',
  [PinoLevel.Info]: 'info',
  [PinoLevel.Warn]: 'warn',
  [PinoLevel.Error]: 'error',
  [PinoLevel.Fatal]: 'fatal',
};

/** Signal → human label. Mirrors `OBSERVABILITY_SIGNAL_LABELS`. */
export const SIGNAL_LABELS: Readonly<Record<ObservabilitySignal, string>> = {
  [ObservabilitySignal.TransactionContention]: 'Lock contention (P2028)',
  [ObservabilitySignal.ConnectionPoolTimeout]: 'Pool timeout (P2024)',
  [ObservabilitySignal.NotificationFailure]: 'Notification failure',
  [ObservabilitySignal.Error]: 'Error',
  [ObservabilitySignal.FailedRequest]: 'Failed request',
  [ObservabilitySignal.Other]: 'Other',
};

/**
 * Chart / tile order for `bySignal`. Explicit rather than derived from the
 * record's key order, so the x-axis is stable across refreshes and the three
 * WARN-level signals (the ones no alarm covers) lead.
 */
export const SIGNAL_ORDER: readonly ObservabilitySignal[] = [
  ObservabilitySignal.TransactionContention,
  ObservabilitySignal.ConnectionPoolTimeout,
  ObservabilitySignal.NotificationFailure,
  ObservabilitySignal.Error,
  ObservabilitySignal.FailedRequest,
  ObservabilitySignal.Other,
];

export const FEED_KIND_LABELS: Readonly<Record<ObservabilityFeedKind, string>> = {
  [ObservabilityFeedKind.All]: 'All failures',
  [ObservabilityFeedKind.Errors]: 'Errors (by level)',
  [ObservabilityFeedKind.Requests]: 'Failed requests (by status)',
  [ObservabilityFeedKind.Signals]: 'Named signals (WARN)',
};

/**
 * Every source this dashboard renders a `ObservabilitySourceStatus` for.
 *
 * `logs`/`sentry` are the #116 errors feed's two halves; `audit`/`analytics`
 * are the two Postgres-backed stores the #263 per-user timeline adds. They
 * share ONE status vocabulary and ONE notice component deliberately: the rule
 * that an empty panel must say WHY is identical whichever store went quiet, and
 * a second copy of that rule is a second place for it to be forgotten.
 */
export type SourceKind = 'logs' | 'sentry' | 'audit' | 'analytics';

/** Human name for each source, used by the notice and the status pill. */
export const SOURCE_TITLES: Readonly<Record<SourceKind, string>> = {
  logs: 'CloudWatch logs',
  sentry: 'Sentry',
  audit: 'Audit trail',
  analytics: 'Analytics events',
};

export interface SourceStatusCopy {
  /** Short label for the status pill. */
  label: string;
  /** Why this panel may be empty. Never implies "nothing is wrong" unless Ok. */
  detail: string;
  /** `ok` reads as neutral/positive; the rest are warnings, not silence. */
  tone: 'ok' | 'warning' | 'danger';
}

/**
 * Exhaustive per-source, per-status copy.
 *
 * The crown-jewel rule of this tab: an empty panel must SAY WHY. Only `Ok`
 * licenses "no failures"; `Disabled`/`Unconfigured`/`Unavailable` all mean
 * "nobody looked", and failures may well exist that are not shown here.
 */
const SOURCE_STATUS_COPY: Record<SourceKind, Record<ObservabilitySourceStatus, SourceStatusCopy>> = {
  logs: {
    [ObservabilitySourceStatus.Ok]: {
      label: 'Live',
      detail:
        'CloudWatch was queried successfully for this window. An empty feed here genuinely means no matching failures were logged.',
      tone: 'ok',
    },
    [ObservabilitySourceStatus.Disabled]: {
      label: 'Disabled',
      detail:
        'The log feed is switched off for this environment. Nothing is being read — this is NOT a statement that there are no errors.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unconfigured]: {
      label: 'Not configured',
      detail:
        'No log group is configured for this environment (SERVER_LOG_GROUP is unset — Terraform sets it per environment). Nothing has been queried, so this panel says nothing about whether the API is healthy.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unavailable]: {
      label: 'Unavailable',
      detail:
        'The log group is configured but the query failed (IAM denial, timeout or an AWS error). Failures may exist that are not shown here — check the CloudWatch console directly.',
      tone: 'danger',
    },
  },
  sentry: {
    [ObservabilitySourceStatus.Ok]: {
      label: 'Live',
      detail:
        'Sentry was queried successfully. An empty list here genuinely means no matching issues.',
      tone: 'ok',
    },
    [ObservabilitySourceStatus.Disabled]: {
      label: 'Disabled',
      detail:
        'Sentry is deliberately switched off for this environment (SENTRY_ENABLED=false). Crashes are not being grouped or reported — this is NOT a statement that there are none.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unconfigured]: {
      label: 'Not configured',
      detail:
        'No Sentry read API token / org / project is configured, so grouped issues cannot be fetched. Sentry itself may still be receiving events — open it directly to check.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unavailable]: {
      label: 'Unavailable',
      detail:
        'Sentry is configured but the request failed (timeout, auth or an upstream 5xx). Issues may exist that are not shown here.',
      tone: 'danger',
    },
  },
  // The two Postgres-backed stores behind the #263 per-user timeline. The API
  // only ever reports `Ok` or `Unavailable` for them today (they are read
  // directly, so there is nothing to disable or leave unconfigured) — the other
  // two are still answered, because a status this build cannot explain is worse
  // than one it can.
  audit: {
    [ObservabilitySourceStatus.Ok]: {
      label: 'Live',
      detail:
        'The audit trail was read for this window. An empty result genuinely means this user took no audited action, and none was taken against them.',
      tone: 'ok',
    },
    [ObservabilitySourceStatus.Disabled]: {
      label: 'Disabled',
      detail:
        'Audit reads are switched off for this environment. Nothing is being read — this is NOT a statement that nothing happened.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unconfigured]: {
      label: 'Not configured',
      detail:
        'The audit store is not wired in this environment, so nothing has been queried. This panel says nothing about what this user did.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unavailable]: {
      label: 'Unavailable',
      detail:
        'The audit query failed (a database error or timeout). Money and governance actions may exist for this user that are not shown here — the other sources below are unaffected.',
      tone: 'danger',
    },
  },
  analytics: {
    [ObservabilitySourceStatus.Ok]: {
      label: 'Live',
      detail:
        'Behavioural events were read for this window. Note these are reported BY the app on the user’s device, so an empty result can also mean the app never got far enough to send anything.',
      tone: 'ok',
    },
    [ObservabilitySourceStatus.Disabled]: {
      label: 'Disabled',
      detail:
        'Analytics reads are switched off for this environment. Nothing is being read — this is NOT a statement that the user did nothing.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unconfigured]: {
      label: 'Not configured',
      detail:
        'The analytics store is not wired in this environment, so nothing has been queried.',
      tone: 'warning',
    },
    [ObservabilitySourceStatus.Unavailable]: {
      label: 'Unavailable',
      detail:
        'The analytics query failed (a database error or timeout). The user may have been active in ways not shown here — the other sources are unaffected.',
      tone: 'danger',
    },
  },
};

/**
 * An unrecognised status is itself a reason not to trust an empty panel — the
 * API is free to add a fourth failure mode, and the honest answer to one this
 * build has never heard of is "unverified", not silence.
 */
const UNKNOWN_STATUS_COPY: SourceStatusCopy = {
  label: 'Unknown',
  detail:
    'The API reported a source status this dashboard does not recognise. Treat this panel as unverified — it may be hiding failures.',
  tone: 'warning',
};

export function sourceStatusCopy(
  source: SourceKind,
  status: ObservabilitySourceStatus,
): SourceStatusCopy {
  return SOURCE_STATUS_COPY[source][status] ?? UNKNOWN_STATUS_COPY;
}

/**
 * Only `Ok` may be read as "nothing is wrong". Used to decide whether an empty
 * panel gets a reassuring empty state or a warning.
 */
export function isSourceTrustworthy(status: ObservabilitySourceStatus): boolean {
  return status === ObservabilitySourceStatus.Ok;
}

/**
 * Allow a value to be used as an `href` only when it is an absolute http(s)
 * URL.
 *
 * Sentry permalinks and the issue-stream link-out arrive as strings from an
 * upstream API; `href` is one of the few React props that still executes what
 * you put in it (`javascript:`), so it gets a scheme check. Everything else on
 * this page is rendered as plain text children, which React escapes.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Time-of-day + seconds — a failures feed is read at second granularity. */
export function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ─── Per-user logs (#263) ────────────────────────────────────────────────────

/**
 * Mirror of `OBSERVABILITY_USER_LOGS`. The window bounds are the SAME numbers as
 * the errors feed (the CloudWatch scan-cost argument does not change because the
 * filter narrowed to one user), but the page size is its own, smaller value:
 * this endpoint returns up to `limit` entries from EACH of three stores, so 500
 * would be a 1,500-row response read by a human rather than charted.
 *
 * The API re-validates every bound with Zod, so a drift here degrades to a 400,
 * never to an unbounded scan.
 */
export const OBSERVABILITY_USER_LOGS = {
  DEFAULT_WINDOW_HOURS: 24,
  /** 7 days — the #116 ceiling, same reasons. */
  MAX_WINDOW_HOURS: 168,
  DEFAULT_LIMIT: 100,
  /** Applied PER SOURCE — the worst-case response is three times this. */
  MAX_LIMIT: 200,
} as const;

/** Window options, all within `MAX_WINDOW_HOURS`. */
export const USER_LOG_WINDOW_OPTIONS = [1, 6, 24, 72, 168] as const;

/** Page-size options, all within `MAX_LIMIT`. */
export const USER_LOG_LIMIT_OPTIONS = [25, 50, 100, 200] as const;

/**
 * Per-source presentation for the merged timeline.
 *
 * `authority` is the load-bearing field. The three stores are NOT equally
 * trustworthy and a support conclusion drawn from the wrong one is how an
 * investigation goes sideways: `audit` is server-authored inside the mutation's
 * own transaction (if the row is there, the write committed), `logs` is the
 * machine's own account of the request, and `analytics` is reported by the app
 * on the user's device — useful for "what screen were they on", never proof
 * that anything happened.
 */
export const USER_SOURCE_COPY: Readonly<
  Record<
    ObservabilityUserSource,
    { label: string; authority: string; className: string; dotClassName: string }
  >
> = {
  [ObservabilityUserSource.Audit]: {
    label: 'Audit',
    authority:
      'Written by the server inside the same transaction as the change. If a row is here, the change committed — and it keeps the amounts.',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    dotClassName: 'bg-emerald-500',
  },
  [ObservabilityUserSource.Logs]: {
    label: 'Request log',
    authority:
      'The API’s own record of a request it handled, from CloudWatch. Shows failures the user saw, and the request id that ties everything together.',
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    dotClassName: 'bg-sky-500',
  },
  [ObservabilityUserSource.Analytics]: {
    label: 'App event',
    authority:
      'Reported by the app on the user’s device, and already stripped of personal data, money and location. Good for “where were they”, never proof that something happened.',
    className: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400',
    dotClassName: 'bg-violet-500',
  },
};

/** Fixed render order for the source filter chips — most authoritative first. */
export const USER_SOURCE_ORDER: readonly ObservabilityUserSource[] = [
  ObservabilityUserSource.Audit,
  ObservabilityUserSource.Logs,
  ObservabilityUserSource.Analytics,
];

/** Map a timeline source onto the shared status vocabulary's source kinds. */
export const USER_SOURCE_KIND: Readonly<Record<ObservabilityUserSource, SourceKind>> = {
  [ObservabilityUserSource.Logs]: 'logs',
  [ObservabilityUserSource.Audit]: 'audit',
  [ObservabilityUserSource.Analytics]: 'analytics',
};

// ─── Proactive admin alerting (#190) ─────────────────────────────────────────

/**
 * Per-alarm-state presentation.
 *
 * ⚠️ `Unknown` is styled as a WARNING, not as a neutral or positive state. The
 * server's own type doc calls rendering it as healthy "the single most
 * misleading thing this surface could do" — an alarm missing from
 * `DescribeAlarms` means nothing is watching that failure mode, which on
 * production (whose Terraform has not been applied since #53) is a live
 * possibility rather than a theoretical one.
 *
 * `InsufficientData` is also not OK: a brand-new alarm with no datapoints yet
 * looks identical to one whose metric has stopped being published.
 */
export const ALARM_STATE_COPY: Readonly<
  Record<AdminAlarmState, { label: string; detail: string; tone: 'ok' | 'warning' | 'danger' }>
> = {
  [AdminAlarmState.Ok]: {
    label: 'OK',
    detail: 'Reporting, and below its threshold.',
    tone: 'ok',
  },
  [AdminAlarmState.Alarm]: {
    label: 'IN ALARM',
    detail: 'Over threshold right now.',
    tone: 'danger',
  },
  [AdminAlarmState.InsufficientData]: {
    label: 'No data',
    detail:
      'The alarm exists but has not had enough datapoints to judge. Normal for a newly created alarm; otherwise the metric may have stopped being published.',
    tone: 'warning',
  },
  [AdminAlarmState.Unknown]: {
    label: 'Not reporting',
    detail:
      'CloudWatch did not return this alarm at all, so nothing is watching this failure mode. It has most likely not been created in this environment yet (production Terraform is pending #53). This is NOT the same as healthy.',
    tone: 'warning',
  },
};

/** Render order: the loudest states first, then the fixed key order. */
export const ALARM_STATE_SEVERITY: Readonly<Record<AdminAlarmState, number>> = {
  [AdminAlarmState.Alarm]: 0,
  [AdminAlarmState.Unknown]: 1,
  [AdminAlarmState.InsufficientData]: 2,
  [AdminAlarmState.Ok]: 3,
};

/**
 * Why the inbox is quiet.
 *
 * Every non-`Sending` status is a reason no email will arrive, and each is
 * shown verbatim so a founder never has to guess whether alerting is broken or
 * merely not armed yet. `EnvironmentNotEligible` is the NORMAL, PERMANENT state
 * on staging — it must not read as a fault.
 */
export const ALERT_EMAIL_STATUS_COPY: Readonly<
  Record<
    AdminAlertEmailStatus,
    { label: string; detail: string; tone: 'ok' | 'warning' | 'neutral' }
  >
> = {
  [AdminAlertEmailStatus.Sending]: {
    label: 'Armed',
    detail:
      'A new ALARM transition will email every active platform admin. One message per recipient, at most one per alarm state change.',
    tone: 'ok',
  },
  [AdminAlertEmailStatus.EnvironmentNotEligible]: {
    label: 'Not eligible',
    detail:
      'This deployment is not on the alert-email allowlist, so it cannot email admins whatever the killswitch is set to. On staging this is the normal, permanent state — the banner above still shows live alarm state.',
    tone: 'neutral',
  },
  [AdminAlertEmailStatus.KillswitchOff]: {
    label: 'Killswitch off',
    detail:
      'The environment is eligible but ADMIN_ALERTS_ENABLED is not true, so no alert email will be sent. On production this is the one switch that arms alerting.',
    tone: 'warning',
  },
  [AdminAlertEmailStatus.EmailSuppressed]: {
    label: 'Email suppressed',
    detail:
      'This environment suppresses ALL outbound email, so alerts cannot leave it even though alerting is otherwise armed.',
    tone: 'warning',
  },
};

/** The environment-level read status, phrased for the alerting surface. */
export const ALERT_SOURCE_COPY: Readonly<
  Record<ObservabilitySourceStatus, { detail: string; trustworthy: boolean }>
> = {
  [ObservabilitySourceStatus.Ok]: {
    detail: 'CloudWatch alarm state was read successfully.',
    trustworthy: true,
  },
  [ObservabilitySourceStatus.Disabled]: {
    detail:
      'Alarm-state reading is switched off for this environment. Nothing below reflects live alarm state.',
    trustworthy: false,
  },
  [ObservabilitySourceStatus.Unconfigured]: {
    detail:
      'No alarm prefix is wired for this environment (Terraform supplies it), so alarm state has never been read. Nothing below says whether anything is on fire.',
    trustworthy: false,
  },
  [ObservabilitySourceStatus.Unavailable]: {
    detail:
      'Alarm state could not be read (IAM denial, timeout or an AWS error). Alarms may be firing that are not shown here — check the CloudWatch console directly.',
    trustworthy: false,
  },
};

/**
 * How often the persistent banner re-reads alert state.
 *
 * 60 seconds is a deliberate middle. The alarms themselves evaluate on a
 * 5-minute period and the email dispatcher runs `rate(5 minutes)`, so polling
 * faster than this cannot make the DATA fresher — it only burns requests. Much
 * slower and the banner stops being the thing that tells a founder first, which
 * is its entire job.
 */
export const ALERT_POLL_INTERVAL_MS = 60_000;
