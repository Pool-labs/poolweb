'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminApiError, qaApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import type { QaJob, QaJobRunResult, QaStatus } from '@/lib/admin/types';
import { BusySpinner, ErrorAlert, SuccessAlert, WarningAlert } from './primitives';

/**
 * Jobs tab: run the scheduled maintenance jobs on demand instead of waiting for
 * their timer.
 *
 * A 504 is NOT a failure — the job is still running server-side and its result
 * simply outlived the request. That distinction is surfaced explicitly, because
 * treating it as an error leads to re-running a destructive purge.
 */

type RunState = {
  busy: boolean;
  error: string | null;
  timedOut: boolean;
  result: QaJobRunResult | null;
};

const IDLE: RunState = { busy: false, error: null, timedOut: false, result: null };

export function JobsTab({ status }: { status: QaStatus }) {
  const [jobs, setJobs] = useState<QaJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, RunState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await qaApi.jobs.list();
      setJobs(res.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runJob = async (job: QaJob) => {
    if (
      !window.confirm(
        `Run "${job.name}" now?\n\n${job.description}\n\nThis executes against the staging database immediately.`,
      )
    ) {
      return;
    }
    setRuns((prev) => ({ ...prev, [job.name]: { ...IDLE, busy: true } }));
    try {
      const result = await qaApi.jobs.run(job.name);
      setRuns((prev) => ({ ...prev, [job.name]: { ...IDLE, result } }));
      await load();
    } catch (e) {
      const statusCode = e instanceof AdminApiError ? e.status : null;
      const message = e instanceof Error ? e.message : 'Run failed';
      setRuns((prev) => ({
        ...prev,
        [job.name]: { ...IDLE, error: message, timedOut: statusCode === 504 },
      }));
      if (statusCode === 504) await load();
    }
  };

  // The status payload lists runnable job names even before /qa/jobs resolves.
  const known = jobs.length > 0 ? jobs : (status.jobs ?? []).map<QaJob>((name) => ({
    name,
    description: '',
    lastRunAt: null,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled jobs</CardTitle>
          <CardDescription>
            Trigger a scheduled job immediately rather than waiting for its timer. Each run is a
            real execution against staging data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">{error}</div>
          ) : known.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No jobs found</div>
          ) : (
            known.map((job) => {
              const run = runs[job.name] ?? IDLE;
              return (
                <div key={job.name} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium">{job.name}</div>
                      {job.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{job.description}</p>
                      )}
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last run: {job.lastRunAt ? formatDateTime(job.lastRunAt) : 'never'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={run.busy}
                      onClick={() => void runJob(job)}
                    >
                      {run.busy ? <BusySpinner /> : <Play className="mr-2 h-3.5 w-3.5" />}
                      Run now
                    </Button>
                  </div>

                  {run.timedOut ? (
                    <WarningAlert title="Timed out waiting — still running server-side">
                      <p>
                        The API returned 504, which means the job did not finish inside the request
                        window. It is <strong>still running</strong> — do not re-run it. Refresh in
                        a moment and check &ldquo;Last run&rdquo;.
                      </p>
                    </WarningAlert>
                  ) : (
                    <ErrorAlert message={run.error} />
                  )}

                  {run.result && (
                    <SuccessAlert title={`Ran ${run.result.job}`}>
                      <p>
                        Deleted <strong>{run.result.deletedCount}</strong> record
                        {run.result.deletedCount === 1 ? '' : 's'} in{' '}
                        <strong>{run.result.durationMs} ms</strong>.
                      </p>
                    </SuccessAlert>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
