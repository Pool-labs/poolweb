'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, Loader2, Plus } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserPicker, type PickedUser } from '@/components/admin/UserPicker';
import { poolsApi } from '@/lib/admin/adminApi';
import { describeCreateFailure, type CreateFailure } from '@/lib/admin/adminErrors';
import { ENV_LABELS, type ApiEnv } from '@/lib/admin/adminEnv';
import { formatMoney, humanizeEnum, parseDollarsToCents } from '@/lib/admin/format';
import {
  ADMIN_CREATE_REASON_LENGTH,
  MAX_CONTRIBUTION_CENTS,
  POOL_NAME_LENGTH,
  PoolType,
  PoolVisibility,
  type AdminCreatePoolResponse,
} from '@/lib/admin/types';

/**
 * Create a pool on somebody's behalf (poolweb#46 over poolmobile#684).
 *
 * ⚠️ THE OWNER IS ALWAYS AN EXPLICITLY CHOSEN USER, never the acting admin by
 * default. An admin-owned pool is a support artefact the people actually using
 * it cannot govern or leave, and ownership transfer is a separate ceremony —
 * picking the right owner at creation is free, fixing it afterwards is not.
 *
 * ⚠️ PRIVATE ONLY, AND THE DIALOG SAYS WHY. `createPoolSchema` requires a
 * PUBLIC pool to carry a non-empty short description AND a canonical city, and
 * #194 makes that city PICKER-ONLY — free text is a 400, not a normalisation.
 * This dashboard has no canonical city picker (the Geography list is cities
 * already in use, which is the wrong domain for a brand-new pool), so offering
 * "Public" here would mean either shipping a second taxonomy or letting the
 * founder hit a 400 they cannot fix. The owner flips it to public in-app,
 * through the guarded visibility endpoint that exists for exactly that.
 */
export function CreatePoolDialog({
  env,
  onCreated,
}: {
  env: ApiEnv;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState<PickedUser[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<PoolType>(PoolType.Custom);
  const [contribution, setContribution] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CreateFailure | null>(null);
  const [result, setResult] = useState<AdminCreatePoolResponse | null>(null);

  const trimmedName = name.trim();
  const trimmedReason = reason.trim();
  const nameValid =
    trimmedName.length >= POOL_NAME_LENGTH.MIN && trimmedName.length <= POOL_NAME_LENGTH.MAX;
  const reasonValid =
    trimmedReason.length >= ADMIN_CREATE_REASON_LENGTH.MIN &&
    trimmedReason.length <= ADMIN_CREATE_REASON_LENGTH.MAX;

  // An empty box means "no contribution", which is 0 — not a parse failure.
  const contributionCents = contribution.trim() === '' ? 0 : parseDollarsToCents(contribution);
  const contributionValid =
    contributionCents !== null && contributionCents <= MAX_CONTRIBUTION_CENTS;

  const ownerValid = owner.length === 1;
  const isProd = env === 'production';
  const canSubmit = ownerValid && nameValid && reasonValid && contributionValid && !busy;

  const reset = () => {
    setOwner([]);
    setName('');
    setType(PoolType.Custom);
    setContribution('');
    setReason('');
    setFailure(null);
    setResult(null);
    setBusy(false);
  };

  const submit = async () => {
    if (!ownerValid || contributionCents === null) return;
    setBusy(true);
    setFailure(null);
    try {
      const res = await poolsApi.create({
        ownerUserId: owner[0].id,
        name: trimmedName,
        type,
        // Stated explicitly rather than left to the server's default: the one
        // reader of this call should not have to know what that default is.
        visibility: PoolVisibility.Private,
        contributionAmountCents: contributionCents,
        reason: trimmedReason,
      });
      setResult(res);
      onCreated();
    } catch (e) {
      setFailure(describeCreateFailure(e, 'pool'));
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
        <Plus className="mr-2 h-4 w-4" />
        New pool
      </Button>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a pool on {ENV_LABELS[env]}</DialogTitle>
          <DialogDescription>
            For setting a group up for somebody. It is audited.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <Alert className="border-emerald-500/40 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{result.pool.name}</strong> created, owned by{' '}
                <strong>{owner[0]?.name ?? 'the chosen user'}</strong>. They can invite members and
                make it public from the app.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/admin/pools/${result.pool.id}`}>Open {result.pool.name}</Link>
              </Button>
              <Button variant="outline" onClick={reset}>
                Create another
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <UserPicker
              label="Owner"
              max={1}
              selected={owner}
              onChange={setOwner}
              disabled={busy}
              hint="The pool belongs to this person — not to you. They govern it and can transfer it later."
            />

            <div className="space-y-1.5">
              <Label htmlFor="create-pool-name">Pool name</Label>
              <Input
                id="create-pool-name"
                value={name}
                maxLength={POOL_NAME_LENGTH.MAX}
                placeholder="Thursday football"
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                {trimmedName.length}/{POOL_NAME_LENGTH.MAX}. Shown on members&rsquo; lock screens in
                notification copy.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-pool-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as PoolType)}
                  disabled={busy}
                >
                  <SelectTrigger id="create-pool-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PoolType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {humanizeEnum(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-pool-contribution">Contribution per member</Label>
                <Input
                  id="create-pool-contribution"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  disabled={busy}
                />
                {/* Money is parsed to INTEGER CENTS by the shared string-based
                    parser — never `parseFloat * 100`. Blank means none. */}
                <p className="text-xs text-muted-foreground">
                  {contribution.trim() === ''
                    ? 'Blank = none'
                    : contributionCents === null
                      ? 'Not a valid amount'
                      : contributionCents > MAX_CONTRIBUTION_CENTS
                        ? `Over the ${formatMoney(MAX_CONTRIBUTION_CENTS)} limit`
                        : formatMoney(contributionCents)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-pool-reason">Why (recorded in the audit log)</Label>
              <Textarea
                id="create-pool-reason"
                rows={2}
                placeholder="Who asked, and what the pool is for."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                {trimmedReason.length}/{ADMIN_CREATE_REASON_LENGTH.MAX} · at least{' '}
                {ADMIN_CREATE_REASON_LENGTH.MIN}.
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Created <strong>private</strong>. A public pool needs a short description and a city
                chosen from the app&rsquo;s own list — the owner makes it public from the app, which
                is also where that list lives.
              </AlertDescription>
            </Alert>

            {isProd && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  This writes a <strong>real pool</strong> to production.
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
              <Button onClick={() => void submit()} disabled={!canSubmit}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create pool
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
