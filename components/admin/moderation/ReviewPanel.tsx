'use client';

/**
 * The review form — "demonstrable action on reports", which is the third thing
 * Apple Guideline 1.2 and Play's UGC policy ask for and the reason this screen
 * exists at all.
 *
 * TWO KINDS OF OUTCOME, and the difference is the whole design:
 *
 *  • `CONTENT_REMOVED` is PERFORMED here. The API sets `Message.deletedAt`
 *    (founder decision D9) in the SAME transaction as the review, after which
 *    the body is stripped server-side and the client renders a tombstone. It is
 *    message-only — the API 400s on any other target — so the option is
 *    disabled with a reason rather than failing after the click.
 *
 *  • `USER_SUSPENDED` / `USER_WARNED` are RECORDED here and carried out
 *    elsewhere. Suspension is the existing #83 `POST /admin/users/:id/suspend`,
 *    which opens its own transaction, writes its own audit action and refuses
 *    to suspend a platform admin. This panel therefore LINKS to the user's page
 *    instead of duplicating that call — the server's delegate-don't-reimplement
 *    rule, mirrored in the UI. Recording the decision here and never following
 *    the link would leave the account untouched, so the panel says that out
 *    loud rather than letting a reviewer assume otherwise.
 */

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { reportsApi } from '@/lib/admin/adminApi';
import {
  canRemoveContent,
  REPORT_ACTION_LABELS,
  REPORT_ACTION_ORDER,
  REPORT_REVIEWER_NOTES_MAX_LENGTH,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_ORDER,
  isTerminal,
} from '@/lib/admin/moderation';
import { ReportAction, ReportStatus, type AdminReportDetail } from '@/lib/admin/types';

/** Said in full before anything irreversible happens. */
const REDACTION_CONFIRM =
  'Remove this message for everyone in the thread?\n\nThe body is stripped server-side and replaced with a tombstone. The evidence snapshot on this report is unaffected — it is a separate copy and survives the redaction.';

export function ReviewPanel({
  report,
  onReviewed,
}: {
  report: AdminReportDetail;
  onReviewed: (updated: AdminReportDetail) => void;
}) {
  // An OPEN report's most likely next move is "I am looking at this"; anything
  // already moved keeps its current state so the form never pre-decides.
  const [status, setStatus] = useState<ReportStatus>(
    report.status === ReportStatus.Open ? ReportStatus.Reviewing : report.status,
  );
  const [action, setAction] = useState<ReportAction>(report.action);
  const [notes, setNotes] = useState(report.reviewerNotes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removable = canRemoveContent(report.targetType);
  const redacting = action === ReportAction.ContentRemoved;
  const delegated = action === ReportAction.UserSuspended || action === ReportAction.UserWarned;

  const unchanged =
    status === report.status &&
    action === report.action &&
    notes.trim() === (report.reviewerNotes ?? '').trim();

  const submit = async () => {
    if (redacting && !window.confirm(REDACTION_CONFIRM)) return;

    setBusy(true);
    setError(null);
    try {
      const updated = await reportsApi.review(report.id, {
        status,
        action,
        // Omitted rather than sent empty: the API only writes `reviewerNotes`
        // when the field is present, so an empty box preserves what a previous
        // reviewer wrote instead of silently erasing it.
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onReviewed(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Review</CardTitle>
        <p className="text-xs text-muted-foreground">
          Recorded against your admin account, in one transaction with whatever it performs, and
          written to the append-only audit log.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="review-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
              <SelectTrigger id="review-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {REPORT_STATUS_LABELS[s]}
                    {isTerminal(s) ? ' (closes the report)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-action">Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as ReportAction)}>
              <SelectTrigger id="review-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_ACTION_ORDER.map((a) => {
                  const blocked = a === ReportAction.ContentRemoved && !removable;
                  return (
                    <SelectItem key={a} value={a} disabled={blocked}>
                      {REPORT_ACTION_LABELS[a]}
                      {blocked ? ' — message reports only' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {redacting && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>This removes the message</AlertTitle>
            <AlertDescription>
              Saving redacts the reported message for everyone in the thread, in the same
              transaction as this decision. The snapshot above is a separate copy and survives it.
              Re-reviewing an already-removed message does not move the redaction timestamp.
            </AlertDescription>
          </Alert>
        )}

        {delegated && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recorded here — carried out elsewhere</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {action === ReportAction.UserSuspended
                  ? 'Saving records the decision on this report. It does NOT suspend the account — suspension is a separate governance write with its own audit trail and its own refusal rules (it will not suspend a platform admin). Do it on the user’s page.'
                  : 'Saving records that a warning was decided on. Pool has no automated warning delivery — reach the person however you intend to, then close the report.'}
              </p>
              {report.reportedUserId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/users/${report.reportedUserId}`}>
                    Open the reported account
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <p className="text-xs">
                  This report is not attributed to an account, so there is nothing to open.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="review-notes">Reviewer notes</Label>
          <Textarea
            id="review-notes"
            value={notes}
            maxLength={REPORT_REVIEWER_NOTES_MAX_LENGTH}
            placeholder="Why this decision. Internal only — never shown to the reporter or the reported account."
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {notes.length}/{REPORT_REVIEWER_NOTES_MAX_LENGTH} · leaving this empty keeps any
            existing notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy || unchanged} onClick={() => void submit()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {redacting ? 'Save review & remove content' : 'Save review'}
          </Button>
          {unchanged && (
            <span className="text-xs text-muted-foreground">
              Nothing has changed yet — a review has to move the report.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
