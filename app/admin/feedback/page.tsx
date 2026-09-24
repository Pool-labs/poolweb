'use client';

/**
 * Feedback inbox (poolmobile #720 — "Tell us what's wrong").
 *
 * A user picks an area, a kind and optionally writes a sentence; the app
 * attaches its build facts. This is where the founders read it and move each
 * row New → Triaged → Fixed.
 *
 * NEWEST-FIRST, unlike the moderation queue. Moderation is a work queue with a
 * published turnaround, so its oldest row matters most; feedback carries no
 * promise, and what a founder wants on opening this tab is "what did people say
 * since I last looked". The API serves (createdAt DESC, id DESC) and "Load
 * more" appends in that order — never re-sorted here.
 *
 * ⚠️ `text` and every `context` field are user-supplied — see FeedbackEntry for
 * the render rule (text children only, no HTML, no hrefs).
 *
 * The header's NEW count comes from the API and spans EVERY filter, so it can
 * be larger than the list below it. That is on purpose: it is "how much is
 * untouched", not "how many rows are on screen".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquareWarning, RefreshCw } from 'lucide-react';

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
import { FeedbackEntry, type FeedbackRowOutcome } from '@/components/admin/feedback/FeedbackEntry';
import { feedbackApi, type FeedbackListParams } from '@/lib/admin/adminApi';
import {
  adjustNewCount,
  FEEDBACK_AREA_LABELS,
  FEEDBACK_AREA_ORDER,
  FEEDBACK_KIND_LABELS,
  FEEDBACK_KIND_ORDER,
  FEEDBACK_PAGE_SIZE,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_ORDER,
} from '@/lib/admin/feedback';
import type {
  AdminFeedbackItem,
  FeedbackArea,
  FeedbackKind,
  FeedbackStatus,
} from '@/lib/admin/types';

const ALL = 'ALL';
type Filter<T> = T | typeof ALL;

export default function AdminFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState<Filter<FeedbackStatus>>(ALL);
  const [areaFilter, setAreaFilter] = useState<Filter<FeedbackArea>>(ALL);
  const [kindFilter, setKindFilter] = useState<Filter<FeedbackKind>>(ALL);

  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [newCount, setNewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per row, so two quick changes on different rows each keep their own spinner.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [outcomes, setOutcomes] = useState<Record<string, FeedbackRowOutcome>>({});

  // A filter change while a page is in flight must not let the stale response
  // land on top of the new list. Every load takes a generation number and only
  // the latest one may write.
  const generation = useRef(0);

  const filters = useCallback(
    (): FeedbackListParams => ({
      status: statusFilter === ALL ? undefined : statusFilter,
      area: areaFilter === ALL ? undefined : areaFilter,
      kind: kindFilter === ALL ? undefined : kindFilter,
      limit: FEEDBACK_PAGE_SIZE.DEFAULT,
    }),
    [statusFilter, areaFilter, kindFilter],
  );

  const load = useCallback(async () => {
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    setOutcomes({});
    try {
      const res = await feedbackApi.list(filters());
      if (gen !== generation.current) return;
      setItems(res.items);
      setNextCursor(res.nextCursor);
      setNewCount(res.newCount);
    } catch (e) {
      if (gen !== generation.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!nextCursor) return;
    const gen = generation.current;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await feedbackApi.list({ ...filters(), cursor: nextCursor });
      if (gen !== generation.current) return;
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      setNewCount(res.newCount);
    } catch (e) {
      if (gen !== generation.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load more feedback');
    } finally {
      setLoadingMore(false);
    }
  };

  const changeStatus = async (item: AdminFeedbackItem, status: FeedbackStatus) => {
    setPending((prev) => ({ ...prev, [item.id]: true }));
    try {
      const updated = await feedbackApi.setStatus(item.id, status);
      // Updated IN PLACE. ⚠️ If a status filter is active and the row no longer
      // matches it, it deliberately STAYS until Refresh: a row vanishing under
      // the cursor mid-triage reads as "my click deleted it", and the success
      // line below would disappear with it.
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setNewCount((c) => (c === null ? c : adjustNewCount(c, item.status, updated.status)));
      setOutcomes((prev) => ({
        ...prev,
        [item.id]: { ok: true, message: `Marked ${FEEDBACK_STATUS_LABELS[updated.status]}` },
      }));
    } catch (e) {
      setOutcomes((prev) => ({
        ...prev,
        [item.id]: {
          ok: false,
          message: `Not saved — ${e instanceof Error ? e.message : 'status change failed'}`,
        },
      }));
    } finally {
      setPending((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const filtered = statusFilter !== ALL || areaFilter !== ALL || kindFilter !== ALL;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquareWarning className="h-6 w-6" />
            Feedback
          </h1>
          {newCount !== null && (
            <Badge variant={newCount > 0 ? 'default' : 'secondary'}>{newCount} new</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Newest first. Sent from the app&rsquo;s &ldquo;Tell us what&rsquo;s wrong&rdquo; form.
        The new count covers every filter. A row whose status you change stays in view until
        Refresh, even if it no longer matches the status filter.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as Filter<FeedbackStatus>)}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {FEEDBACK_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {FEEDBACK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as Filter<FeedbackArea>)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Area filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All areas</SelectItem>
            {FEEDBACK_AREA_ORDER.map((a) => (
              <SelectItem key={a} value={a}>
                {FEEDBACK_AREA_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as Filter<FeedbackKind>)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Kind filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All kinds</SelectItem>
            {FEEDBACK_KIND_ORDER.map((k) => (
              <SelectItem key={k} value={k}>
                {FEEDBACK_KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error && items.length === 0 ? (
            <div role="alert" className="py-12 text-center text-sm text-destructive">
              {error}
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {filtered ? 'No feedback matches these filters.' : 'No feedback yet.'}
            </p>
          ) : (
            <ul>
              {items.map((item) => (
                <FeedbackEntry
                  key={item.id}
                  item={item}
                  pending={pending[item.id] === true}
                  outcome={outcomes[item.id]}
                  onChangeStatus={(i, s) => void changeStatus(i, s)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* A failed "Load more" keeps the rows already loaded and says so here. */}
      {error && items.length > 0 && !loading && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {nextCursor && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
