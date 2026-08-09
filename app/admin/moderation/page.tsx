'use client';

/**
 * Moderation queue (web issue #13, over the poolmobile #158 API).
 *
 * This is the screen that makes messaging shippable: Apple Guideline 1.2 and
 * Play's UGC policy require a block mechanism, a report mechanism, and
 * DEMONSTRABLE ACTION on reports. The server shipped the first two and the
 * write half of the third; until this page existed, a filed report went into a
 * table nobody could see.
 *
 * ⚠️ OLDEST-FIRST, AND IT IS NOT RE-SORTED HERE. Every other list in the
 * product is newest-first because those are feeds, where recency is the value.
 * This is a work queue with a published turnaround (triage 24h, resolve 72h),
 * so the row that matters most is the one closest to breaching — the oldest.
 * The API returns it that way deliberately; sorting it into a feed on the
 * client would starve the tail, which is the exact failure a turnaround
 * commitment exists to prevent.
 *
 * The status filter defaults to OPEN — the work that is actually outstanding.
 * The API accepts one status at a time, so `Reviewing` (also unresolved, and
 * counted in `openCount`) is one click away and the header states the combined
 * unresolved count so nothing in flight can quietly vanish from view.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SlaBadge } from '@/components/admin/moderation/SlaBadge';
import { reportsApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import {
  formatAge,
  isUnresolved,
  REPORT_PAGE_SIZE,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_ORDER,
  REPORT_TARGET_LABELS,
  REPORT_TURNAROUND,
} from '@/lib/admin/moderation';
import { ReportStatus, type AdminReportSummary } from '@/lib/admin/types';

const ALL = 'ALL';

/** One shared clock for every countdown on the page. */
const CLOCK_TICK_MS = 60_000;

export default function AdminModerationPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | typeof ALL>(ReportStatus.Open);
  const [items, setItems] = useState<AdminReportSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.list({
        status: statusFilter === ALL ? undefined : statusFilter,
        limit: REPORT_PAGE_SIZE.DEFAULT,
      });
      setItems(res.items);
      setNextCursor(res.nextCursor);
      setOpenCount(res.openCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await reportsApi.list({
        status: statusFilter === ALL ? undefined : statusFilter,
        cursor: nextCursor,
        limit: REPORT_PAGE_SIZE.DEFAULT,
      });
      // Appended, never merged-and-re-sorted: the API's (createdAt ASC, id ASC)
      // order continues exactly where the cursor left off.
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      setOpenCount(res.openCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more reports');
    } finally {
      setLoadingMore(false);
    }
  };

  const reportedName = (r: AdminReportSummary) =>
    r.reportedUserDisplayName || (r.reportedUserHandle ? `@${r.reportedUserHandle}` : null) || '—';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldAlert className="h-6 w-6" />
            Moderation
          </h1>
          {openCount !== null && (
            <Badge variant={openCount > 0 ? 'destructive' : 'secondary'}>
              {openCount} unresolved
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Oldest first — the row nearest its deadline is at the top. Published commitment: triage
        within {REPORT_TURNAROUND.TRIAGE_HOURS}h, resolution within{' '}
        {REPORT_TURNAROUND.RESOLUTION_HOURS}h of a report being filed.{' '}
        <span className="whitespace-nowrap">
          &ldquo;Unresolved&rdquo; = open + reviewing.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ReportStatus | typeof ALL)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {REPORT_STATUS_LABELS[s]}
                {isUnresolved(s) ? ' — needs attention' : ''}
              </SelectItem>
            ))}
            <SelectItem value={ALL}>All statuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="space-y-1 py-12 text-center">
              <p className="text-muted-foreground">
                No {statusFilter === ALL ? '' : REPORT_STATUS_LABELS[statusFilter].toLowerCase()}{' '}
                reports.
              </p>
              {statusFilter !== ALL && openCount !== null && openCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {openCount} report{openCount === 1 ? ' is' : 's are'} still unresolved under
                  another status — check &ldquo;Reviewing&rdquo;.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filed</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Turnaround</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(r.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatAge(r.createdAt, now)}
                      </TableCell>
                      <TableCell>
                        <SlaBadge report={r} now={now} />
                      </TableCell>
                      {/* Snapshotted identity — survives account deletion, so a
                          report against a departed account still shows a name. */}
                      <TableCell className="font-medium">{reportedName(r)}</TableCell>
                      <TableCell>{REPORT_REASON_LABELS[r.reason]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {REPORT_TARGET_LABELS[r.targetType]}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isUnresolved(r.status) ? 'default' : 'secondary'}>
                          {REPORT_STATUS_LABELS[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/moderation/${r.id}`}>Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {nextCursor && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load older reports
          </Button>
        </div>
      )}
    </div>
  );
}
