'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { impersonationApi } from '@/lib/admin/adminApi';
import { formatCountdown, formatDateTime } from '@/lib/admin/format';
import {
  ImpersonationEndReason,
  ImpersonationSessionStatus,
  IMPERSONATION_TTL_MINUTES,
  type ImpersonationSessionSummary,
} from '@/lib/admin/types';

/**
 * Impersonation sessions (#84, over poolmobile #590) — the oversight half of
 * "view as". Lives on the ADMINS page because mutual oversight is admin
 * governance: the list shows EVERY admin's sessions (the API has no
 * "mine-only" mode, deliberately), and any admin may end any session,
 * including a colleague's. That mutual visibility IS the oversight model —
 * impersonation is only self-policing if the other founders can see it.
 *
 * Status is DERIVED server-side (`active`/`expired`/`ended` — no stored
 * column, no sweeper). The countdown here is display-only and clamps to
 * "Expired" at zero, which is exactly what the server would answer.
 */

const LIST_LIMIT = 50;

function partyLabel(displayName: string | null, email: string | null, id: string): string {
  return displayName || email || id;
}

const END_REASON_LABEL: Record<ImpersonationEndReason, string> = {
  [ImpersonationEndReason.AdminEnded]: 'ended by its own admin',
  [ImpersonationEndReason.RevokedByAdmin]: 'ended by another admin',
  [ImpersonationEndReason.Expired]: 'closed after expiry',
};

export function ImpersonationSessions() {
  const [sessions, setSessions] = useState<ImpersonationSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await impersonationApi.list({ limit: LIST_LIMIT });
      setSessions(res.sessions);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load impersonation sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A session is live for countdown purposes when the server called it active
  // AND its expiry is still ahead of the local clock.
  const hasLive = useMemo(
    () =>
      sessions.some(
        (s) =>
          s.status === ImpersonationSessionStatus.Active &&
          new Date(s.expiresAt).getTime() > now,
      ),
    [sessions, now],
  );

  // Tick only while something is actually counting down.
  useEffect(() => {
    if (!hasLive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasLive]);

  const onEnd = async (session: ImpersonationSessionSummary) => {
    const admin = partyLabel(session.adminDisplayName, session.adminEmail, session.adminUserId);
    const target = partyLabel(session.targetDisplayName, session.targetEmail, session.targetUserId);
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        [
          `End ${admin}'s session viewing as ${target}?`,
          '',
          'Any admin may end any session — the token stops working on its very next request, and the end is audited with your name as the actor.',
        ].join('\n'),
      )
    ) {
      return;
    }
    setEndingId(session.id);
    setError(null);
    setNotice(null);
    try {
      await impersonationApi.end(session.id);
      setNotice(`Ended the session viewing as ${target}. The token is dead.`);
    } catch (e) {
      // A 409 means someone else ended it first (or it just expired and was
      // closed) — the list refresh below shows the truth either way.
      setError(e instanceof Error ? e.message : 'Could not end that session.');
    } finally {
      setEndingId(null);
      await load();
    }
  };

  const statusCell = (session: ImpersonationSessionSummary) => {
    const remainingMs = new Date(session.expiresAt).getTime() - now;
    if (session.status === ImpersonationSessionStatus.Active && remainingMs > 0) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive">Active</Badge>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatCountdown(remainingMs)} left
          </span>
        </div>
      );
    }
    if (session.status === ImpersonationSessionStatus.Ended) {
      return <Badge variant="secondary">Ended</Badge>;
    }
    // Server said expired, or server said active and the countdown has since
    // hit zero locally — the token is equally dead in both cases.
    return <Badge variant="outline">Expired</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Impersonation sessions</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Every &quot;view as&quot; session any admin starts is listed here — mutual visibility is
        the oversight model, and <strong>any admin may end any session</strong>, not just their
        own. A session is a <strong>read-only</strong>, {IMPERSONATION_TTL_MINUTES}-minute look at
        the product as one user; the written reason is mandatory because every start and end is
        audited.
      </p>

      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0 sm:p-4">
          {loading && sessions.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No impersonation sessions yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Viewing as</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Expires / ended</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const live =
                      session.status === ImpersonationSessionStatus.Active &&
                      new Date(session.expiresAt).getTime() > now;
                    return (
                      <TableRow key={session.id}>
                        <TableCell>{statusCell(session)}</TableCell>
                        <TableCell className="font-medium">
                          {partyLabel(
                            session.adminDisplayName,
                            session.adminEmail,
                            session.adminUserId,
                          )}
                        </TableCell>
                        <TableCell>
                          {partyLabel(
                            session.targetDisplayName,
                            session.targetEmail,
                            session.targetUserId,
                          )}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className="block truncate text-sm" title={session.reason}>
                            {session.reason}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(session.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {session.endedAt ? (
                            <span>
                              {formatDateTime(session.endedAt)}
                              {session.endReason && (
                                <span className="block text-xs">
                                  {END_REASON_LABEL[session.endReason]}
                                </span>
                              )}
                            </span>
                          ) : (
                            formatDateTime(session.expiresAt)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {live && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={endingId !== null}
                              onClick={() => void onEnd(session)}
                            >
                              {endingId === session.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'End session'
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
