'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, Loader2, UserPlus } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usersApi } from '@/lib/admin/adminApi';
import { describeCreateFailure, type CreateFailure } from '@/lib/admin/adminErrors';
import { ADMIN_CREATE_REASON_LENGTH, type AdminCreateUserResponse } from '@/lib/admin/types';
import { userLabel } from '@/components/admin/UserPicker';
import { ENV_LABELS, type ApiEnv } from '@/lib/admin/adminEnv';

/**
 * Pre-create an account for somebody you are helping (poolweb#46 over
 * poolmobile#684).
 *
 * ⚠️ THE MENTAL MODEL "I MADE THEM AN ACCOUNT" IS WRONG IN THREE WAYS, and the
 * dialog says all three BEFORE the button rather than after the surprise:
 *
 *  1. **They claim it by Email-OTP.** This mints no password and no token; it
 *     creates the row a normal signup would have created. `verifyOtp` is still
 *     the only door.
 *  2. **It lands un-activated.** No name, no date of birth, no credential — so
 *     the person finishes onboarding themselves, and the account shows up under
 *     "Un-activated — held at" on Stats until they do. Skipping signup
 *     requirements would make that metric lie and strand them mid-wizard anyway.
 *  3. **It gives you no access to it.** Acting as somebody is `View as` (#84),
 *     which has its own gate, its own 15-minute TTL and its own audit trail,
 *     and sits one click away on the detail page.
 *
 * ⚠️ AND THE ENDPOINT IS FIND-**OR**-CREATE. `findOrCreateUserByEmail` returns
 * an existing row for an address that already has an account, so the success
 * state branches on `isNewUser` and says "this account already existed" rather
 * than claiming a creation that did not happen — the failure mode this codebase
 * keeps re-learning (`silent-success-failures`).
 */

/** A shape an email must at least have. The server is the real validator. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateUserDialog({
  env,
  onCreated,
}: {
  /** The environment being written to — named in the confirm copy. */
  env: ApiEnv;
  /** Called after a successful create so the list behind can re-read. */
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CreateFailure | null>(null);
  const [result, setResult] = useState<AdminCreateUserResponse | null>(null);

  const trimmedEmail = email.trim();
  const trimmedReason = reason.trim();
  const emailValid = EMAIL_SHAPE.test(trimmedEmail);
  const reasonValid =
    trimmedReason.length >= ADMIN_CREATE_REASON_LENGTH.MIN &&
    trimmedReason.length <= ADMIN_CREATE_REASON_LENGTH.MAX;
  const isProd = env === 'production';

  const reset = () => {
    setEmail('');
    setReason('');
    setFailure(null);
    setResult(null);
    setBusy(false);
  };

  const submit = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const res = await usersApi.create({ email: trimmedEmail, reason: trimmedReason });
      setResult(res);
      onCreated();
    } catch (e) {
      setFailure(describeCreateFailure(e, 'user'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        New user
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create an account on {ENV_LABELS[env]}</DialogTitle>
          <DialogDescription>
            For helping somebody who cannot get an account themselves. It is audited.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* ── Outcome ──────────────────────────────────────────────────── */
          <div className="space-y-3">
            <Alert className="border-emerald-500/40 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {result.isNewUser ? (
                  <>
                    Account created for <strong>{trimmedEmail}</strong>. They can sign in with a
                    code sent to that address, and will finish setting up their profile themselves.
                  </>
                ) : (
                  /* ⚠️ NOT a creation. Saying "created" here would be a lie the
                     founder acts on — they would stop looking for the account
                     they actually needed. */
                  <>
                    <strong>This account already existed.</strong> Nothing was created — the
                    address <strong>{trimmedEmail}</strong> was already registered, and this is it.
                  </>
                )}
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/admin/users/${result.user.id}`}>
                  Open {userLabel(result.user)}
                </Link>
              </Button>
              <Button variant="outline" onClick={reset}>
                Create another
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form ─────────────────────────────────────────────────────── */
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-1 text-xs">
                <p>
                  <strong>They claim it with a login code</strong> — this creates the account, not
                  a password, and sends nothing.
                </p>
                <p>
                  <strong>It starts un-activated.</strong> No name or date of birth yet, so it
                  appears under &ldquo;Un-activated&rdquo; on Stats until they finish signing up.
                </p>
                <p>
                  <strong>It does not let you in.</strong> To look at their account, use{' '}
                  <em>View as</em> on the user page.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
                type="email"
                autoComplete="off"
                placeholder="person@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
              {trimmedEmail.length > 0 && !emailValid && (
                <p className="text-xs text-destructive">That does not look like an email address.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-user-reason">Why (recorded in the audit log)</Label>
              <Textarea
                id="create-user-reason"
                rows={2}
                placeholder="Who asked, and why they could not sign up themselves."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                {trimmedReason.length}/{ADMIN_CREATE_REASON_LENGTH.MAX} · at least{' '}
                {ADMIN_CREATE_REASON_LENGTH.MIN}. This row looks identical to an organic signup
                without it.
              </p>
            </div>

            {isProd && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  This writes a <strong>real account</strong> to production.
                </AlertDescription>
              </Alert>
            )}

            {failure && (
              <Alert
                variant={failure.notServedYet ? 'default' : 'destructive'}
                className={failure.notServedYet ? 'border-amber-500/50 bg-amber-500/10' : undefined}
              >
                <AlertDescription className="text-sm">{failure.message}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={!emailValid || !reasonValid || busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
