'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Eye, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { impersonationApi, AdminApiError } from '@/lib/admin/adminApi';
import { formatCountdown, formatDateTime } from '@/lib/admin/format';
import {
  IMPERSONATION_MAX_REASON_LENGTH,
  IMPERSONATION_MIN_REASON_LENGTH,
  IMPERSONATION_TTL_MINUTES,
  type StartImpersonationResponse,
} from '@/lib/admin/types';

/**
 * "View as" (#84, over poolmobile #590 — the founder's option-1 decision):
 * session management plus showing the token ONCE.
 *
 * Two phases in one dialog:
 *
 *  1. REASON — collects the mandatory written justification (10–280 chars,
 *     client-counted but SERVER-VALIDATED) and states, before anything is
 *     minted, exactly what a session is: read-only, 15 minutes, audited with
 *     the caller's name as actor and this reason on the row.
 *  2. TOKEN — the one-time display. The server returns `impersonationToken`
 *     exactly once and stores only the session id it carries, so this screen
 *     is the only place the credential will ever exist.
 *
 * ⚠️ THE TOKEN LIVES IN DIALOG-LOCAL STATE AND NOWHERE ELSE. It is never
 * written to a cookie, localStorage, or any store that outlives this dialog —
 * closing the dialog clears it, and there is no way to see it again (the
 * recovery path is ending the session and starting a new, separately audited
 * one). While the token is on screen, the overlay and Escape do NOT dismiss:
 * an accidental close would destroy a credential that cannot be re-shown, so
 * closing requires the named "Done — discard the token" action.
 */

interface ViewAsDialogProps {
  targetUserId: string;
  /** Display name for copy; the API is only ever called with the id. */
  targetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewAsDialog({ targetUserId, targetName, open, onOpenChange }: ViewAsDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 409 = the caller already has a live session — needs the Admins-page link. */
  const [conflict, setConflict] = useState(false);
  /** ⚠️ The ONLY place the token ever lives. Cleared on every close. */
  const [result, setResult] = useState<StartImpersonationResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const tokenRef = useRef<HTMLTextAreaElement | null>(null);

  const tokenOnScreen = result !== null;

  // Tick the countdown only while a token is displayed.
  useEffect(() => {
    if (!tokenOnScreen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [tokenOnScreen]);

  const reset = useCallback(() => {
    setReason('');
    setSubmitting(false);
    setError(null);
    setConflict(false);
    setResult(null); // ← the token is gone from the page here.
    setCopied(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const trimmed = reason.trim();
  const tooShort = trimmed.length < IMPERSONATION_MIN_REASON_LENGTH;
  const tooLong = trimmed.length > IMPERSONATION_MAX_REASON_LENGTH;

  const onStart = async () => {
    if (tooShort || tooLong) return;
    setSubmitting(true);
    setError(null);
    setConflict(false);
    try {
      const res = await impersonationApi.start(targetUserId, trimmed);
      setNow(Date.now());
      setResult(res);
    } catch (e) {
      // Surface the SERVER'S message — the refusals (self / platform admin /
      // suspended target / live session) are its calls, and its copy names
      // them. A generic "action failed" here would hide the one fact the
      // operator needs.
      setConflict(e instanceof AdminApiError && e.status === 409);
      setError(e instanceof Error ? e.message : 'Could not start the session.');
    } finally {
      setSubmitting(false);
    }
  };

  const onCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.impersonationToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API refused (permissions / non-secure context): select the
      // token so a manual ⌘C still works, and say nothing false.
      tokenRef.current?.focus();
      tokenRef.current?.select();
    }
  };

  const remainingMs = result ? new Date(result.expiresAt).getTime() - now : 0;
  const expired = tokenOnScreen && remainingMs <= 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        // While the one-time token is on screen, closing must be a deliberate,
        // named action — not an overlay click or a stray Escape.
        hideCloseButton={tokenOnScreen}
        onInteractOutside={(e) => {
          if (tokenOnScreen) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (tokenOnScreen) e.preventDefault();
        }}
      >
        {!tokenOnScreen ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                View as {targetName}
              </DialogTitle>
              <DialogDescription>
                This mints a <strong>read-only</strong> token for the mobile API as this user. It
                expires after {IMPERSONATION_TTL_MINUTES} minutes, any admin can end it early, and
                the session is audited with <strong>your name as the actor</strong> and this reason
                on the row.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label htmlFor="view-as-reason" className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="view-as-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Support ticket — user reports their pool balance looks wrong"
                disabled={submitting}
                rows={3}
                maxLength={IMPERSONATION_MAX_REASON_LENGTH + 20}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  The reason is mandatory because it is audited — it must say why this look was
                  needed ({IMPERSONATION_MIN_REASON_LENGTH}–{IMPERSONATION_MAX_REASON_LENGTH}{' '}
                  characters).
                </span>
                <span className={tooLong ? 'text-destructive' : undefined}>
                  {trimmed.length}/{IMPERSONATION_MAX_REASON_LENGTH}
                </span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {conflict && (
                    <>
                      {' '}
                      You can end your current session in{' '}
                      <Link href="/admin/admins" className="underline">
                        Admins → Impersonation sessions
                      </Link>
                      .
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => void onStart()} disabled={submitting || tooShort || tooLong}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start read-only session
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Read-only session started</DialogTitle>
              <DialogDescription>
                Viewing as <strong>{targetName}</strong> for {result.ttlMinutes} minutes.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                <strong>This token is a live credential.</strong> It authorizes the mobile API as
                this user — read-only, until it expires or the session is ended.{' '}
                <strong>It cannot be shown again</strong>: the server does not store it, so once
                you close this dialog it is gone. Copy it now if you need it.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <textarea
                ref={tokenRef}
                readOnly
                value={result.impersonationToken}
                rows={4}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full resize-none rounded-md border border-input bg-muted px-3 py-2 font-mono text-xs break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Impersonation token (shown once)"
              />
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => void onCopy()}>
                  {copied ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      Copy token
                    </>
                  )}
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {expired ? (
                    <span className="text-destructive">Expired — the token no longer works.</span>
                  ) : (
                    <>Expires {formatDateTime(result.expiresAt)} · {formatCountdown(remainingMs)} left</>
                  )}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Send it as <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>{' '}
              against the mobile API. Writes are refused, and it can never reach{' '}
              <code className="font-mono">/admin</code>. Any admin can end this session early in
              Admins → Impersonation sessions — it dies on its next request.
            </p>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done — discard the token</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
