'use client';

/**
 * One row of the Feedback inbox (poolmobile #720).
 *
 * ⚠️ EVERY STRING ON THIS ROW THAT CAME FROM A PHONE IS UNTRUSTED. `text` is
 * prose a user typed, and every `context` field is a string the app attached —
 * bounded by the API's Zod schema, but still client-supplied. The #116 L3/L4
 * rule at full strength: they render as React TEXT CHILDREN only. Never
 * `dangerouslySetInnerHTML`, never markdown, never an `href` or `src`, never a
 * class name. The only link on the row is the internal `/admin/users/<id>`
 * route built from the SERVER-derived `userId`. React escapes text children,
 * which is exactly what `tests/unit/admin/feedback.test.ts` pins with an
 * `<img onerror>` payload.
 */

import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/admin/format';
import {
  FEEDBACK_AREA_LABELS,
  FEEDBACK_KIND_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_ORDER,
  feedbackAuthorName,
  formatAppVersion,
  formatPlatform,
  truncateUpdateId,
} from '@/lib/admin/feedback';
import {
  FeedbackKind,
  FeedbackStatus,
  type AdminFeedbackItem,
  type FeedbackContext,
} from '@/lib/admin/types';

/** The outcome of the last status change on a row — always visible, never silent. */
export interface FeedbackRowOutcome {
  ok: boolean;
  message: string;
}

/** The user's words, line breaks kept, as plain text. `null` is a stated absence. */
export function FeedbackText({ text }: { text: string | null }) {
  if (text === null || text.trim() === '') {
    return <p className="text-sm italic text-muted-foreground">No text</p>;
  }
  return (
    <p
      data-testid="feedback-text"
      className="whitespace-pre-wrap break-words text-sm leading-relaxed"
    >
      {text}
    </p>
  );
}

/** A compact line of build/device facts. Each value is a text child. */
export function FeedbackContextLine({ context }: { context: FeedbackContext }) {
  const version = formatAppVersion(context);
  return (
    <p
      data-testid="feedback-context"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 break-all text-xs text-muted-foreground"
    >
      <span>{formatPlatform(context)}</span>
      {version && <span>{version}</span>}
      {context.updateId && (
        <span>
          OTA{' '}
          <span className="font-mono" title={context.updateId}>
            {truncateUpdateId(context.updateId)}
          </span>
        </span>
      )}
      {context.locale && <span>{context.locale}</span>}
      {context.screen && (
        <span>
          screen <span className="font-mono">{context.screen}</span>
        </span>
      )}
    </p>
  );
}

export function FeedbackEntry({
  item,
  pending,
  outcome,
  onChangeStatus,
}: {
  item: AdminFeedbackItem;
  /** True while this row's status write is in flight. */
  pending: boolean;
  outcome?: FeedbackRowOutcome;
  onChangeStatus: (item: AdminFeedbackItem, status: FeedbackStatus) => void;
}) {
  return (
    <li data-testid="feedback-row" className="space-y-2 border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link
              href={`/admin/users/${encodeURIComponent(item.userId)}`}
              className="font-medium hover:underline"
            >
              {feedbackAuthorName(item)}
            </Link>
            {item.userDisplayName && item.userHandle && (
              <span className="text-sm text-muted-foreground">@{item.userHandle}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{FEEDBACK_AREA_LABELS[item.area] ?? item.area}</Badge>
            <Badge variant={item.kind === FeedbackKind.Broken ? 'destructive' : 'secondary'}>
              {FEEDBACK_KIND_LABELS[item.kind] ?? item.kind}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div
            role="group"
            aria-label="Status"
            className="inline-flex overflow-hidden rounded-md border"
          >
            {FEEDBACK_STATUS_ORDER.map((s) => {
              const current = item.status === s;
              return (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={current ? 'default' : 'ghost'}
                  aria-pressed={current}
                  disabled={pending || current}
                  onClick={() => onChangeStatus(item, s)}
                  className={cn('h-8 rounded-none px-3', current && 'disabled:opacity-100')}
                >
                  {FEEDBACK_STATUS_LABELS[s]}
                </Button>
              );
            })}
          </div>
          {pending ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          ) : outcome ? (
            <span
              role={outcome.ok ? 'status' : 'alert'}
              className={cn(
                'text-xs',
                outcome.ok ? 'text-green-700 dark:text-green-400' : 'text-destructive',
              )}
            >
              {outcome.message}
            </span>
          ) : null}
        </div>
      </div>

      <FeedbackText text={item.text} />
      <FeedbackContextLine context={item.context} />
    </li>
  );
}
