'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminApiError, qaApi } from '@/lib/admin/adminApi';
import type { QaStatus } from '@/lib/admin/types';
import { InspectTab } from './InspectTab';
import { JobsTab } from './JobsTab';
import { NotificationsTab } from './NotificationsTab';
import { StateTab } from './StateTab';
import { WorkflowsTab } from './WorkflowsTab';

/**
 * The staging QA console shell.
 *
 * VISIBILITY GATE — the API is the source of truth. `GET /qa/status` returns
 * **404 whenever the console is disabled server-side** (it is gated by both a
 * killswitch and an environment allowlist, and there is deliberately no
 * always-mounted capability endpoint that would leak "QA tools exist here but
 * are off"). A 404 is therefore treated as "this does not exist here": nothing
 * is rendered and the browser is sent back to the overview. The server-side
 * `getApiEnv()` check in the page is only a first pass; this is the
 * authoritative one, and neither is the nav entry.
 *
 * `status` also carries the live blast-radius limits, which are threaded into
 * every picker instead of being hard-coded in the UI.
 */
export function QaConsole() {
  const router = useRouter();
  const [status, setStatus] = useState<QaStatus | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await qaApi.status();
      if (res.enabled === false) {
        setDisabled(true);
        setStatus(null);
        return;
      }
      setStatus(res);
    } catch (e) {
      // 404 === disabled server-side, never "not found".
      if (e instanceof AdminApiError && e.status === 404) {
        setDisabled(true);
        setStatus(null);
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load QA console');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (disabled) router.replace('/admin/overview');
  }, [disabled, router]);

  if (disabled) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error ?? 'QA console unavailable'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">QA console</h1>
        <Badge className="bg-amber-400/20 text-amber-700 hover:bg-amber-400/20 dark:text-amber-400">
          {status.environment.toUpperCase()}
        </Badge>
      </div>

      <Alert className="border-amber-400/60 bg-amber-400/5">
        <AlertTitle className="text-amber-700 dark:text-amber-400">
          Everything here is real
        </AlertTitle>
        <AlertDescription>
          These controls send actual notifications, run actual jobs and move actual (simulated
          ledger) money in <strong>{status.environment}</strong>. They are not simulations — other
          people testing on this environment will see the effects.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="notifications">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="state">State</TabsTrigger>
          <TabsTrigger value="inspect">Inspect</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab status={status} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-4">
          <JobsTab status={status} />
        </TabsContent>
        <TabsContent value="workflows" className="mt-4">
          <WorkflowsTab status={status} />
        </TabsContent>
        <TabsContent value="state" className="mt-4">
          <StateTab status={status} />
        </TabsContent>
        <TabsContent value="inspect" className="mt-4">
          <InspectTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
