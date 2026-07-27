'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { qaApi } from '@/lib/admin/adminApi';
import { QaJobName, type QaJobRunResponse, type QaStatus } from '@/lib/admin/types';
import { BusySpinner, ErrorAlert, SuccessAlert, WarningAlert, useQaAction } from './primitives';

/**
 * Jobs tab: run a scheduled maintenance job now instead of waiting for its
 * timer.
 *
 * There is no job-list endpoint — the runnable set comes from `GET /qa/status`,
 * and `job` is an ENUM MEMBER sent in the request BODY (never a path segment or
 * a command string), so nothing here can name an arbitrary executable.
 *
 * A 504 is NOT a failure: the job outlived the request window and is still
 * running server-side. Surfacing that distinction matters because both of these
 * jobs are destructive purges that must not be casually re-run.
 */

const JOB_LABELS: Record<QaJobName, string> = {
  [QaJobName.PurgeAnalytics]: 'Purge analytics',
  [QaJobName.PurgeAudit]: 'Purge audit logs',
};

const JOB_DESCRIPTIONS: Record<QaJobName, string> = {
  [QaJobName.PurgeAnalytics]:
    'Deletes analytics_events past the 12-month retention window (the purge:analytics job).',
  [QaJobName.PurgeAudit]:
    'Deletes audit_logs past the 24-month retention window (the purge:audit job).',
};

export function JobsTab({ status }: { status: QaStatus }) {
  const jobs = status.jobs ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scheduled jobs</CardTitle>
        <CardDescription>
          Trigger a scheduled job immediately. Each run executes the same job function the timer
          calls, against staging data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No runnable jobs advertised</div>
        ) : (
          jobs.map((job) => <JobRow key={job} job={job} />)
        )}
      </CardContent>
    </Card>
  );
}

function JobRow({ job }: { job: QaJobName }) {
  const action = useQaAction<QaJobRunResponse>();
  const [timedOut, setTimedOut] = useState(false);

  const label = JOB_LABELS[job] ?? job;
  const description = JOB_DESCRIPTIONS[job] ?? '';

  const run = () => {
    if (
      !window.confirm(
        `Run "${job}" now?\n\n${description}\n\nThis executes against the staging database immediately.`,
      )
    ) {
      return;
    }
    setTimedOut(false);
    void action.run(
      () => qaApi.jobs.run({ job }),
      (err, statusCode) => {
        if (statusCode === 504) {
          setTimedOut(true);
          return null;
        }
        return err.message;
      },
    );
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="font-mono text-xs text-muted-foreground">{job}</div>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" size="sm" variant="outline" disabled={action.busy} onClick={run}>
          {action.busy ? <BusySpinner /> : <Play className="mr-2 h-3.5 w-3.5" />}
          Run now
        </Button>
      </div>

      {timedOut ? (
        <WarningAlert title="Timed out waiting — still running server-side">
          <p>
            The API returned 504, which means the job did not finish inside the request window. It
            is <strong>still running</strong> — do not re-run it.
          </p>
        </WarningAlert>
      ) : (
        <ErrorAlert message={action.error} />
      )}

      {action.result && (
        <SuccessAlert title={`Ran ${action.result.job}`}>
          <p>
            Affected <strong>{action.result.affectedCount}</strong> row
            {action.result.affectedCount === 1 ? '' : 's'} in{' '}
            <strong>{action.result.durationMs} ms</strong>.
          </p>
        </SuccessAlert>
      )}
    </div>
  );
}
