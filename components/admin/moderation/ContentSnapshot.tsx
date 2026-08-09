'use client';

/**
 * The evidence panel.
 *
 * ⚠️ THIS IS A FROZEN COPY, NOT LIVE CONTENT — and saying so is the panel's
 * main job. `Report.contentSnapshot` is founder decision D2: the reported text
 * is copied ONTO THE REPORT ROW at report time, which is why it survives the
 * sender deleting their account (D2 hard-deletes their messages), an admin
 * redaction (D9), and the conversation itself. A reviewer reading it must never
 * assume the thread still looks like this — nor that a redaction they just
 * performed erased what they are looking at.
 *
 * ⚠️ SECURITY: this is reported abusive content — user-authored free text,
 * chosen by someone whose behaviour is under review. It is rendered as a TEXT
 * CHILD only (the #116 L3/L4 rule at full strength): no
 * `dangerouslySetInnerHTML`, no value used as an `href` or a `src`, and
 * `whitespace-pre-wrap break-words` so a 4000-character single "word" cannot
 * blow out the layout.
 */

import { FileLock2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ContentSnapshot({
  snapshot,
  capturedAt,
}: {
  snapshot: string | null;
  /** The report's own `createdAt` — the instant the copy was taken. */
  capturedAt: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileLock2 className="h-4 w-4" />
          Reported content — snapshot
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Frozen copy taken when the report was filed ({new Date(capturedAt).toLocaleString('en-US')}
          ). It is <strong>not</strong> live content: the thread may have changed, the message may
          have been redacted, and the sender may have deleted their account since. Evidence lives
          here precisely so none of that can destroy it.
        </p>
      </CardHeader>
      <CardContent>
        {snapshot ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            {snapshot}
          </pre>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No snapshot was stored for this report. A USER report carries no message text by design
            — judge it from the reason, the reporter&rsquo;s notes, and the account itself.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
