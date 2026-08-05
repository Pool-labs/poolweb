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

export type SourceKind = 'logs' | 'sentry';

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
