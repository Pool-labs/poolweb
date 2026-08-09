/**
 * "Is the app healthy right now?" — the plain-language verdict (PoolWeb #14).
 *
 * The Errors & Health tab already showed everything a developer needs: signal
 * tiles, a level breakdown, a status breakdown, raw failure lines and per-alarm
 * CloudWatch state. What it did NOT do is answer the question a non-developer
 * founder actually arrives with, which is not "how many P2024s were there" but
 * "is something wrong, and does it matter". This module answers that, and only
 * from data the API ALREADY serves — the #116 errors feed and the #190 alerts
 * endpoint. No new endpoint, no invented metric.
 *
 * THREE RULES SHAPE EVERY LINE BELOW, all inherited from #116/#190:
 *
 *  1. **Only a successfully-read source may license good news.** A zero counted
 *     off a source nobody queried is a lie in the most dangerous direction, so a
 *     failed or unconfigured read produces `Unknown`, never `Ok`. There is a
 *     colour for "I cannot tell" and it is not green.
 *  2. **`unknown` alarm state is not `ok`.** An alarm CloudWatch did not return
 *     means nothing is watching that failure mode — a live possibility on
 *     production, whose Terraform has not been applied since #53.
 *  3. **Every finding says what a USER would have experienced**, not what the
 *     log line said. "Some people were shown an error" is actionable to a
 *     founder; "level>=50 count 12" is not.
 *
 * It is a PURE function of its inputs — no fetching, no state — so the verdict
 * on screen is always derived from exactly the payloads the panels below it are
 * rendering, and the two can never tell different stories.
 */

import {
  AdminAlarmState,
  AdminAlertKey,
  ObservabilitySignal,
  ObservabilitySourceStatus,
  type AdminAlertState,
  type ObservabilityErrorsFeed,
} from './types';

/** Worst-first: the strip takes the maximum severity of its findings. */
export enum HealthLevel {
  /** Something is wrong right now and users are likely affected. */
  Critical = 'critical',
  /** Something is off, or was recently, but the platform is serving. */
  Warning = 'warning',
  /** A source could not be read, so the honest answer is "I cannot tell". */
  Unknown = 'unknown',
  /** Everything that could be checked was checked, and it is clean. */
  Ok = 'ok',
}

const LEVEL_SEVERITY: Readonly<Record<HealthLevel, number>> = {
  [HealthLevel.Critical]: 0,
  [HealthLevel.Warning]: 1,
  [HealthLevel.Unknown]: 2,
  [HealthLevel.Ok]: 3,
};

export interface HealthFinding {
  /** Stable key — React list identity, never shown. */
  key: string;
  level: HealthLevel;
  /** One short line: WHAT is happening. */
  title: string;
  /** One or two plain sentences: what it means, and what to do about it. */
  detail: string;
}

export interface HealthVerdict {
  level: HealthLevel;
  /** The headline a founder reads first. */
  headline: string;
  /** One sentence qualifying the headline (window, or what could not be read). */
  subline: string;
  /** Ordered worst-first. Empty only when everything checked came back clean. */
  findings: HealthFinding[];
}

/**
 * Count thresholds, over the CURRENTLY SELECTED feed window.
 *
 * These are display heuristics for a summary strip, not alarms — the durable,
 * always-on counters are the CloudWatch metric filters behind #190's alarms, and
 * those are what page a founder. The numbers here only decide what colour a
 * sentence is, so they are deliberately conservative: any server error at all is
 * worth a founder's attention at beta scale, and a handful of lock-contention
 * retries is genuinely normal.
 */
export const HEALTH_THRESHOLDS = {
  /** Any thrown error at all is worth surfacing at beta scale. */
  ERRORS_WARNING: 1,
  /** Sustained errors — treat as an incident, not a blip. */
  ERRORS_CRITICAL: 25,
  /** A single undelivered notification is invisible to everyone else. */
  NOTIFICATION_FAILURES_WARNING: 1,
  /** A systemic notification outage returns 200 to every caller. */
  NOTIFICATION_FAILURES_CRITICAL: 10,
  /** A few contention retries under load are expected and self-correcting. */
  CONTENTION_WARNING: 5,
  /** Running out of database connections can fail a pure read. */
  POOL_TIMEOUTS_WARNING: 1,
  /** 5xx responses — the user saw a failure. */
  SERVER_RESPONSES_WARNING: 1,
  SERVER_RESPONSES_CRITICAL: 25,
} as const;

/**
 * What each watched alarm means, said the way a founder would say it.
 *
 * The SERVER already sends a frozen `label` and `description` per alarm (#190),
 * and those are rendered verbatim in the alerts panel — this is deliberately a
 * different register: the consequence, and the first thing to do. A key the
 * server adds later has no entry here and falls back to its own description, so
 * a new alarm is never silently unexplained.
 */
export const ALERT_KEY_PLAIN_LANGUAGE: Readonly<Record<AdminAlertKey, string>> = {
  [AdminAlertKey.ServerErrorRate]:
    'The API is throwing errors faster than normal. People using the app right now are likely seeing failures — open the recent failures list below and look at what they were trying to do.',
  [AdminAlertKey.NotificationFailureRate]:
    'Notifications are failing to send. Nobody sees an error when this happens — invitations, settle-up reminders and messages simply never arrive — so this alarm is the only sign of it.',
  [AdminAlertKey.BalanceDrift]:
    'A pool’s balance no longer matches the deposits and expenses behind it. This is a money problem and it does not fix itself: check the pool’s ledger before anyone spends from it.',
};

/**
 * Plain-language for the three WARN-level signals NO ALARM COVERS.
 *
 * These are the ones this surface exists for. All three are logged at WARN on
 * purpose, which puts them below the `ServerErrorCount` alarm's threshold and
 * below the tab's own default level filter — so unless something says them out
 * loud, they are invisible to everybody. The `remediation` line is separate from
 * `detail` because P2028 and P2024 are split precisely BECAUSE their fixes
 * differ; collapsing them into one number gets the wrong fix applied.
 */
export const SIGNAL_PLAIN_LANGUAGE: Readonly<
  Partial<
    Record<
      ObservabilitySignal,
      { title: (n: number) => string; detail: string; remediation: string }
    >
  >
> = {
  [ObservabilitySignal.TransactionContention]: {
    title: (n) => `${n} money action${n === 1 ? '' : 's'} had to wait and gave up`,
    detail:
      'Two people acted on the same pool at the same moment and one was asked to try again. A few of these under load is normal and self-correcting; a steady stream means deposits and settle-ups are queueing behind each other.',
    remediation: 'If it persists: the settlement/deposit lock timings need tuning (Prisma P2028).',
  },
  [ObservabilitySignal.ConnectionPoolTimeout]: {
    title: (n) => `${n} request${n === 1 ? '' : 's'} could not get a database connection`,
    detail:
      'The API ran out of free database connections, so requests failed even though nothing else was broken. It affects reads as well as writes — if this is not a one-off, the connection pool is undersized for the traffic.',
    remediation: 'If it persists: the database connection pool needs resizing (Prisma P2024).',
  },
  [ObservabilitySignal.NotificationFailure]: {
    title: (n) => `${n} notification${n === 1 ? '' : 's'} never went out`,
    detail:
      'The action itself worked and the person got no error — the notification behind it just failed silently. This log line is the only evidence it happened, which is why it is called out on its own.',
    remediation:
      'Any of these is worth reading the line for: a systemic outage returns 200 to every caller and pages nobody.',
  },
};

/** The three signals above, in the order they are surfaced. */
export const UNALARMED_SIGNALS: readonly ObservabilitySignal[] = [
  ObservabilitySignal.NotificationFailure,
  ObservabilitySignal.TransactionContention,
  ObservabilitySignal.ConnectionPoolTimeout,
];

function worst(levels: HealthLevel[]): HealthLevel {
  return levels.reduce(
    (acc, level) => (LEVEL_SEVERITY[level] < LEVEL_SEVERITY[acc] ? level : acc),
    HealthLevel.Ok,
  );
}

/** Sum the 5xx buckets of the feed's `byStatus` breakdown. */
function serverErrorResponses(byStatus: Record<string, number> | undefined): number {
  return Object.entries(byStatus ?? {}).reduce(
    (sum, [status, count]) => (Number(status) >= 500 ? sum + count : sum),
    0,
  );
}

function windowPhrase(hours: number | undefined): string {
  if (!hours) return 'the selected window';
  if (hours < 24) return `the last ${hours} hours`;
  const days = hours / 24;
  return days === 1 ? 'the last 24 hours' : `the last ${days} days`;
}

/**
 * Derive the verdict from the two payloads the tab already holds.
 *
 * `alerts`/`feed` may be null (not yet loaded, or the call failed) — a null is
 * treated as "could not be read", which is `Unknown`, never `Ok`.
 */
export function deriveHealth({
  alerts,
  feed,
}: {
  alerts: AdminAlertState | null;
  feed: ObservabilityErrorsFeed | null;
}): HealthVerdict {
  const findings: HealthFinding[] = [];

  // ── Alarms: live state, and the only half that can say "right now". ──
  if (!alerts) {
    findings.push({
      key: 'alerts-unread',
      level: HealthLevel.Unknown,
      title: 'Alarm state could not be read',
      detail:
        'Nothing here reflects whether an alarm is firing. Something may well be wrong — this is a failure to look, not a clean result.',
    });
  } else {
    if (alerts.status !== ObservabilitySourceStatus.Ok) {
      findings.push({
        key: 'alerts-source',
        level: HealthLevel.Unknown,
        title: 'Alarm state is not being read in this environment',
        detail:
          'CloudWatch alarm state could not be fetched, so the alarms below say nothing about whether anything is on fire. See the alerting panel for the exact reason.',
      });
    }

    for (const alarm of alerts.alarms) {
      if (alarm.state === AdminAlarmState.Alarm) {
        findings.push({
          key: `alarm-${alarm.key}`,
          level: HealthLevel.Critical,
          title: alarm.label,
          detail: ALERT_KEY_PLAIN_LANGUAGE[alarm.key] ?? alarm.description,
        });
      } else if (
        alarm.state === AdminAlarmState.Unknown ||
        alarm.state === AdminAlarmState.InsufficientData
      ) {
        findings.push({
          key: `alarm-${alarm.key}`,
          level: HealthLevel.Unknown,
          title: `Nothing is watching: ${alarm.label}`,
          detail:
            alarm.state === AdminAlarmState.Unknown
              ? 'This alarm does not exist in this environment, so this failure mode is unmonitored. It is not the same as healthy.'
              : 'This alarm exists but has not had enough data to judge. Normal for a new alarm; otherwise its metric may have stopped being published.',
        });
      }
    }
  }

  // ── The failures feed: what actually happened inside the window. ──
  const hours = feed?.window.hours;
  if (!feed) {
    findings.push({
      key: 'feed-unread',
      level: HealthLevel.Unknown,
      title: 'Recent failures could not be read',
      detail:
        'The failures feed did not load, so nothing below counts as evidence that the last few hours were clean.',
    });
  } else if (feed.logs.status !== ObservabilitySourceStatus.Ok) {
    findings.push({
      key: 'feed-source',
      level: HealthLevel.Unknown,
      title: 'The API’s own logs are not being read',
      detail:
        'No log lines could be fetched for this environment, so the counts below are not a clean bill of health — they are an absence of information.',
    });
  } else {
    const summary = feed.logs.summary;
    const bySignal = summary.bySignal;

    const errors = bySignal[ObservabilitySignal.Error] ?? 0;
    if (errors >= HEALTH_THRESHOLDS.ERRORS_WARNING) {
      findings.push({
        key: 'signal-error',
        level:
          errors >= HEALTH_THRESHOLDS.ERRORS_CRITICAL ? HealthLevel.Critical : HealthLevel.Warning,
        title: `${errors} unexpected error${errors === 1 ? '' : 's'} in ${windowPhrase(hours)}`,
        detail:
          'Something threw where it should not have. Each of these is a request that did not do what the person asked — the list further down shows what they were trying to do.',
      });
    }

    const fiveXx = serverErrorResponses(summary.byStatus);
    if (fiveXx >= HEALTH_THRESHOLDS.SERVER_RESPONSES_WARNING) {
      findings.push({
        key: 'server-responses',
        level:
          fiveXx >= HEALTH_THRESHOLDS.SERVER_RESPONSES_CRITICAL
            ? HealthLevel.Critical
            : HealthLevel.Warning,
        title: `${fiveXx} request${fiveXx === 1 ? '' : 's'} came back as a server failure`,
        detail:
          'These are the failures a person would have seen as “something went wrong” in the app. (4xx responses are excluded here — those are usually the app or a person asking for something that does not exist.)',
      });
    }

    for (const signal of UNALARMED_SIGNALS) {
      const count = bySignal[signal] ?? 0;
      const copy = SIGNAL_PLAIN_LANGUAGE[signal];
      if (!copy) continue;

      const threshold =
        signal === ObservabilitySignal.NotificationFailure
          ? HEALTH_THRESHOLDS.NOTIFICATION_FAILURES_WARNING
          : signal === ObservabilitySignal.ConnectionPoolTimeout
            ? HEALTH_THRESHOLDS.POOL_TIMEOUTS_WARNING
            : HEALTH_THRESHOLDS.CONTENTION_WARNING;
      if (count < threshold) continue;

      const critical =
        signal === ObservabilitySignal.NotificationFailure &&
        count >= HEALTH_THRESHOLDS.NOTIFICATION_FAILURES_CRITICAL;

      findings.push({
        key: `signal-${signal}`,
        level: critical ? HealthLevel.Critical : HealthLevel.Warning,
        title: copy.title(count),
        detail: copy.detail,
      });
    }

    if (feed.logs.truncated) {
      findings.push({
        key: 'feed-truncated',
        level: HealthLevel.Warning,
        title: 'There were more failures than fit on one page',
        detail:
          'The counts above cover only the most recent page of lines, so the real totals are higher. Narrow the window to see a complete picture.',
      });
    }
  }

  // ── An armed alerter with nobody to tell is a silent failure. ──
  if (alerts && alerts.email.enabled && alerts.email.recipientCount === 0) {
    findings.push({
      key: 'no-recipients',
      level: HealthLevel.Warning,
      title: 'Alerts are armed but there is nobody to email',
      detail:
        'If something breaks out of hours, no one will be told. Grant at least one platform admin on the Admins tab.',
    });
  }

  findings.sort((a, b) => LEVEL_SEVERITY[a.level] - LEVEL_SEVERITY[b.level]);

  const level = worst(findings.map((f) => f.level));

  const headline =
    level === HealthLevel.Critical
      ? 'Something is wrong right now'
      : level === HealthLevel.Warning
        ? 'Serving, but something needs a look'
        : level === HealthLevel.Unknown
          ? 'Can’t tell — something isn’t being watched'
          : 'Everything looks healthy';

  const subline =
    level === HealthLevel.Ok
      ? `No alarms are firing and nothing failed in ${windowPhrase(hours)}.`
      : level === HealthLevel.Unknown
        ? 'One or more health sources could not be read, so a quiet screen here is not evidence that the app is fine.'
        : level === HealthLevel.Critical
          ? 'At least one thing below is affecting people using the app. Start at the top.'
          : `Nothing is paging anyone, but the items below happened in ${windowPhrase(hours)}.`;

  return { level, headline, subline, findings };
}
