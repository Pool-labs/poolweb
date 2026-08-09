'use client';

/**
 * One report, with the evidence and the decision (web issue #13 over the
 * poolmobile #158 API).
 *
 * Three things are kept visually distinct on purpose, because conflating them
 * is how a moderation call goes wrong:
 *
 *  1. The FACTS the server derived — who, what, when, which thread. Not
 *     supplied by the reporter, so not in doubt.
 *  2. The REPORTER'S OWN WORDS (`details`) — an accusation, not a finding.
 *  3. The SNAPSHOT (`contentSnapshot`) — a frozen copy of the reported content
 *     taken at report time (D2), which is EVIDENCE and explicitly not live
 *     content.
 *
 * ⚠️ (2) and (3) are user-authored free text written by people whose behaviour
 * is under review — the #116 L3/L4 rule at full strength. Rendered as TEXT
 * CHILDREN only: no `dangerouslySetInnerHTML`, and no value from the payload is
 * ever used as an `href` or a `src`. The only links on this page are internal
 * `/admin/users/<uuid>` routes built from server-derived ids.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentSnapshot } from '@/components/admin/moderation/ContentSnapshot';
import { ReviewPanel } from '@/components/admin/moderation/ReviewPanel';
import { SlaBadge } from '@/components/admin/moderation/SlaBadge';
import { reportsApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import {
  isUnresolved,
  REPORT_ACTION_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
} from '@/lib/admin/moderation';
import { ReportAction, type AdminReportDetail } from '@/lib/admin/types';

const CLOCK_TICK_MS = 60_000;

export default function AdminReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await reportsApi.get(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const reportedName =
    report &&
    (report.reportedUserDisplayName ||
      (report.reportedUserHandle ? `@${report.reportedUserHandle}` : null) ||
      'Unattributed report');

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/admin/moderation">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to the queue
        </Link>
      </Button>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error || !report ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            {error ?? 'Report not found'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{reportedName}</h1>
            <Badge variant={isUnresolved(report.status) ? 'default' : 'secondary'}>
              {REPORT_STATUS_LABELS[report.status]}
            </Badge>
            {report.action !== ReportAction.None && (
              <Badge variant="outline">{REPORT_ACTION_LABELS[report.action]}</Badge>
            )}
            <SlaBadge report={report} now={now} />
          </div>

          {report.action === ReportAction.ContentRemoved && (
            <Alert>
              <AlertTitle>Content was removed on this report</AlertTitle>
              <AlertDescription>
                The reported message is redacted for everyone in the thread. The snapshot below is a
                separate copy and is unaffected — reviewing again will not move the redaction
                timestamp.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="Report ID" value={report.id} mono />
                <Field label="Filed" value={formatDateTime(report.createdAt)} />
                <Field label="Reason" value={REPORT_REASON_LABELS[report.reason]} />
                <Field label="Target" value={REPORT_TARGET_LABELS[report.targetType]} />
                <Field label="Target ID" value={report.targetId} mono />
                <Field label="Conversation" value={report.conversationId ?? '—'} mono />
                <Field label="Reviewed" value={formatDateTime(report.reviewedAt)} />
                <Field label="Reviewed by" value={report.reviewedById ?? '—'} mono />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Accounts</CardTitle>
                <p className="text-xs text-muted-foreground">
                  The reported account is derived server-side — a reporter never gets to name who
                  they are accusing. Names are snapshotted at report time, so they survive the
                  account being deleted.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Reported</div>
                  <div className="font-medium">{reportedName}</div>
                  {report.reportedUserHandle && (
                    <div className="text-xs text-muted-foreground">@{report.reportedUserHandle}</div>
                  )}
                  {report.reportedUserId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/users/${report.reportedUserId}`}>
                        Open account (suspend / restore)
                      </Link>
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Not attributed to an account.
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground">Reporter</div>
                  <div className="font-mono text-xs">{report.reporterId}</div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/users/${report.reporterId}`}>Open reporter</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">What the reporter said</CardTitle>
              <p className="text-xs text-muted-foreground">
                Their own words — an accusation, not a finding. Judge it against the snapshot.
              </p>
            </CardHeader>
            <CardContent>
              {report.details ? (
                <p className="whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 text-sm">
                  {report.details}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description was added — they picked a reason only.
                </p>
              )}
            </CardContent>
          </Card>

          <ContentSnapshot snapshot={report.contentSnapshot} capturedAt={report.createdAt} />

          {report.reviewerNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reviewer notes</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Internal only — never shown to the reporter or the reported account.
                </p>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap break-words text-sm">{report.reviewerNotes}</p>
              </CardContent>
            </Card>
          )}

          <ReviewPanel report={report} onReviewed={setReport} />
        </>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={mono ? 'break-all text-right font-mono text-xs' : 'text-right'}>{value}</span>
    </div>
  );
}
