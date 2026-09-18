'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Send } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AdminApiError, supportApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import { cn } from '@/lib/utils';
import type {
  ConversationMessage,
  SupportConversation,
} from '@/lib/admin/types';

/**
 * Support (#45 over poolmobile#683) — read and answer in-app support threads
 * without signing into the mobile app as `support@poolapp.co`.
 *
 * ⚠️ THE PAGE'S REAL JOB IS THE EMPTY STATE. `MESSAGING_ENABLED` defaults OFF
 * and fails closed, and the API 404s all three routes when it is — before the
 * identity gate, deliberately. So an empty list is ambiguous between "messaging
 * is off in this environment", "no support account exists yet" and "nobody has
 * asked for help", and only the third is good news. Each is rendered as its own
 * stated sentence; none of them is allowed to look like the others (#116).
 *
 * ⚠️ EVERY MESSAGE BODY IS USER-AUTHORED FREE TEXT — the #116 L3/L4 rule at
 * full strength. Rendered as TEXT children only: no `dangerouslySetInnerHTML`,
 * and no message value is ever an `href` or `src`. The only links on this page
 * are internal `/admin/users/<id>` routes built from server-derived ids.
 *
 * ⚠️ THE THREAD CANNOT SHOW WHICH ADMIN REPLIED, and the page does not pretend
 * otherwise: the sender of every outbound message is the SHARED support
 * account. The server's `admin.support_replied` audit row is the record of who
 * typed it, and the composer says so rather than implying a byline.
 */

/** Why the thread list is empty — three different facts, three sentences. */
type SupportUnavailable =
  /** The API 404s: messaging is killswitched off, or no support account yet. */
  | 'not-served'
  /** The call failed for some other reason. */
  | 'failed';

const PAGE_SIZE = 25;

export default function AdminSupportPage() {
  const [threads, setThreads] = useState<SupportConversation[]>([]);
  const [unavailable, setUnavailable] = useState<SupportUnavailable | null>(null);
  const [failureDetail, setFailureDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setUnavailable(null);
    setFailureDetail(null);
    try {
      const res = await supportApi.conversations(PAGE_SIZE);
      setThreads(res.items);
      // Keep the open thread if it is still in the list; otherwise fall back to
      // the one most in need of an answer rather than to nothing.
      setSelectedId((current) =>
        current && res.items.some((t) => t.id === current)
          ? current
          : (res.items[0]?.id ?? null),
      );
    } catch (e) {
      // ⚠️ A 404 here is NOT "no threads" — it is the killswitch or the absent
      // support account, and the server deliberately makes the two
      // indistinguishable from outside. Say that, rather than rendering a
      // reassuring empty queue.
      if (e instanceof AdminApiError && e.status === 404) {
        setUnavailable('not-served');
      } else {
        setUnavailable('failed');
        setFailureDetail(e instanceof Error ? e.message : null);
      }
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <Button variant="outline" size="sm" onClick={() => void loadThreads()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : unavailable ? (
        <UnavailableNotice reason={unavailable} detail={failureDetail} />
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {/* Reached only when the API ANSWERED with an empty list, which is
                the one case that really does mean nobody is waiting. */}
            No one has opened a support thread on this environment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ThreadList
            threads={threads}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {selected ? (
            <Thread thread={selected} onReplied={() => void loadThreads()} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Pick a thread to read it.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/** ⚠️ Never the words "no threads" — see the page note. */
function UnavailableNotice({
  reason,
  detail,
}: {
  reason: SupportUnavailable;
  detail: string | null;
}) {
  return (
    <Alert className="border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-1 text-sm">
        {reason === 'not-served' ? (
          <>
            <p className="font-medium">Support threads are not readable here.</p>
            <p className="text-xs">
              Either messaging is switched off in this environment (
              <code>MESSAGING_ENABLED</code>), or no one has ever opened a
              support thread on it, so the shared support account does not exist
              yet. The API deliberately answers the same way to both.{' '}
              <strong>This is not &ldquo;nobody needs help&rdquo;</strong> — it
              means nothing could be read.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">Could not load support threads.</p>
            <p className="text-xs">
              {detail ?? 'The request failed.'} Nothing here says whether anyone
              is waiting.
            </p>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** The queue. Ordered by the server: most recent activity first. */
function ThreadList({
  threads,
  selectedId,
  onSelect,
}: {
  threads: SupportConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="max-h-[70vh] overflow-y-auto p-2">
        <ul className="space-y-1">
          {threads.map((thread) => {
            const person = otherParticipant(thread);
            const active = thread.id === selectedId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onSelect(thread.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left transition-colors',
                    active ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {person?.displayName ?? 'Unknown person'}
                    </span>
                    {thread.unreadCount > 0 && (
                      // "Waiting on an answer" — the only figure on this page
                      // that is a work-queue signal.
                      <span className="shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {previewOf(thread.lastMessage)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(thread.lastMessageAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Thread({
  thread,
  onReplied,
}: {
  thread: SupportConversation;
  onReplied: () => void;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const person = otherParticipant(thread);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportApi.messages(thread.id, PAGE_SIZE);
      // The API returns newest-first; a thread reads oldest-first.
      setMessages([...res.items].reverse());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this thread.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [thread.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardContent className="flex h-[70vh] flex-col gap-3 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{person?.displayName ?? 'Unknown person'}</p>
            <p className="text-xs text-muted-foreground">
              Opened {formatDateTime(thread.createdAt)}
            </p>
          </div>
          {person && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/users/${person.userId}`}>Open their account</Link>
            </Button>
          )}
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              This thread has no messages in the readable window.
            </p>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                fromPerson={message.senderId === person?.userId}
              />
            ))
          )}
        </div>

        <Composer conversationId={thread.id} onSent={() => {
          void load();
          onReplied();
        }} />
      </CardContent>
    </Card>
  );
}

/** ⚠️ Body is a TEXT child. Never `dangerouslySetInnerHTML`, never an href. */
function MessageBubble({
  message,
  fromPerson,
}: {
  message: ConversationMessage;
  fromPerson: boolean;
}) {
  // The server strips the body for both of these before the row leaves the API,
  // so there is nothing to fall back to — and nothing that should be shown.
  const withheld = message.deletedAt !== null || message.hiddenByBlock;
  return (
    <div className={cn('flex', fromPerson ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg border px-3 py-2',
          fromPerson ? 'bg-muted' : 'bg-primary/5 border-primary/30',
        )}
      >
        <p className={cn('whitespace-pre-wrap text-sm', withheld && 'italic text-muted-foreground')}>
          {withheld
            ? message.deletedAt !== null
              ? 'This message was removed.'
              : 'This message is hidden by a block.'
            : message.body}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {fromPerson ? 'Them' : 'Pool Support'} · {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function Composer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: () => void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = body.trim();

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await supportApi.reply(conversationId, trimmed);
      setBody('');
      onSent();
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.status === 404
          ? 'This environment cannot send support replies — messaging is off, or the thread is gone. Nothing was sent.'
          : `${e instanceof Error ? e.message : 'Could not send.'} Nothing was sent.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <Textarea
        aria-label="Reply as Pool Support"
        rows={3}
        placeholder="Reply as Pool Support…"
        value={body}
        disabled={busy}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* ⚠️ Said out loud rather than implied: the thread shows the shared
            account as the sender, and the audit row is what records you. */}
        <p className="text-xs text-muted-foreground">
          Sends as <strong>Pool Support</strong>. Your name is not on the message — it is on the
          audit row.
        </p>
        <Button onClick={() => void send()} disabled={trimmed.length === 0 || busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send reply
        </Button>
      </div>
    </div>
  );
}

/**
 * The person on the other side.
 *
 * ⚠️ Chosen by ELIMINATION against the thread's creator, not by matching a
 * support id the page does not have: `createdById` is the person who opened it
 * (support never does), so anyone else in `participants` is the support account.
 */
function otherParticipant(thread: SupportConversation) {
  return (
    thread.participants.find((p) => p.userId === thread.createdById) ??
    thread.participants[0] ??
    null
  );
}

function previewOf(message: ConversationMessage | null): string {
  if (!message) return 'No messages yet';
  if (message.deletedAt !== null) return 'Message removed';
  if (message.hiddenByBlock) return 'Message hidden';
  return message.body;
}
