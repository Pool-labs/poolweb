'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Bomb,
  Sprout,
  TriangleAlert,
  UserRoundPlus,
  UserRoundX,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { qaApi } from '@/lib/admin/adminApi';
import { formatMoney, humanizeEnum, parseDollarsToCents } from '@/lib/admin/format';
import {
  PoolStatus,
  QA_FORCE_POOL_STATUS_CONFIRMATION,
  QA_MAX_DEPOSIT_CENTS,
  QA_RESET_ACCOUNT_CONFIRMATION,
  QA_SEED_CONFIRMATION,
  QA_WIPE_CONFIRMATION,
  QaResetStep,
  QaResetStepStatus,
  type QaDepositResponse,
  type QaPoolStatusResponse,
  type QaResetAccountResponse,
  type QaSeedResponse,
  type QaStatus,
  type QaSyntheticUsersResponse,
} from '@/lib/admin/types';
import { PoolPicker, type PickedPool } from './PoolPicker';
import { UserPicker, type PickedUser } from './UserPicker';
import {
  ActingUserFrame,
  BusySpinner,
  ConfirmPhraseInput,
  ErrorAlert,
  FormField,
  MoneyField,
  SuccessAlert,
  WarningAlert,
  useQaAction,
} from './primitives';

/**
 * State tab: manufacture the preconditions a test needs.
 *
 * Cards are ordered by blast radius, and the four guarded ones — reset, forced
 * status, seed, wipe — each carry a DISTINCT typed confirmation phrase, so no
 * action can be reached by a typo in another's box. Every phrase is compared
 * with strict equality (no trim, no case-folding), exactly as the server does.
 *
 * Seed and wipe both report `preservedUserCount` — the admin/allowlisted
 * accounts deliberately kept — which is the number that answers "did I just
 * lock us out?".
 */

export function StateTab({ status }: { status: QaStatus }) {
  return (
    <div className="space-y-6">
      <SyntheticUsersCard max={status.limits.maxSyntheticUsers} />
      <DepositCard />
      <ResetAccountCard />
      <ForcePoolStatusCard />
      <SeedCard />
      <WipeCard />
    </div>
  );
}

// ─── Deposit ──────────────────────────────────────────────────────────────────

function DepositCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [amount, setAmount] = useState('');
  const action = useQaAction<QaDepositResponse>();

  const cents = parseDollarsToCents(amount);
  const overCap = cents !== null && cents > QA_MAX_DEPOSIT_CENTS;
  const ready = Boolean(pool) && actor.length === 1 && cents !== null && cents > 0 && !overCap;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4" />
          Deposit into a pool
        </CardTitle>
        <CardDescription>
          Funds a pool through the real deposit path, so the member deposit flags, the pool balance
          and the Deposit row all land exactly as they do in the app. This is what makes testing
          balances and settlements a constructed scenario rather than a reseed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <ActingUserFrame>
          <UserPicker
            label="Actor (the depositing member)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
            hint="Must be an active member of the pool — the deposit service enforces that."
          />
        </ActingUserFrame>

        <MoneyField
          id="qa-deposit-amount"
          label="Amount"
          value={amount}
          onChange={setAmount}
          disabled={action.busy}
          hint={
            overCap ? (
              <span className="text-destructive">
                Over the {formatMoney(QA_MAX_DEPOSIT_CENTS)} per-deposit cap — the console gets no
                wider range than the app.
              </span>
            ) : (
              `Capped at ${formatMoney(QA_MAX_DEPOSIT_CENTS)}, the same limit the app uses.`
            )
          }
        />

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actor[0] || cents === null) return;
            void action.run(() =>
              qaApi.state.deposit({
                actorUserId: actor[0].id,
                poolId: pool.id,
                amountCents: cents,
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Deposit
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title={`Deposited ${formatMoney(action.result.amountCents)}`}>
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Stat label="New pool balance" value={formatMoney(action.result.newBalanceCents)} />
                <Stat label="Deposit status" value={humanizeEnum(action.result.status)} />
              </div>
              <dl className="space-y-1 text-sm">
                <IdRow label="Deposit id" value={action.result.depositId} />
                <IdRow label="Credited to" value={action.result.userId} />
              </dl>
            </div>
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Reset account (destructive, per-step outcomes) ───────────────────────────

const RESET_STEP_LABELS: Record<QaResetStep, string> = {
  [QaResetStep.LeavePool]: 'Leave pool',
  [QaResetStep.DeleteAccount]: 'Delete account',
  [QaResetStep.Recreate]: 'Recreate account',
};

function ResetStepBadge({ status }: { status: QaResetStepStatus }) {
  if (status === QaResetStepStatus.Succeeded) {
    return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">Succeeded</Badge>;
  }
  if (status === QaResetStepStatus.Failed) {
    return <Badge variant="destructive">Refused</Badge>;
  }
  return <Badge variant="secondary">Skipped</Badge>;
}

/**
 * Per-step outcomes for a reset.
 *
 * The call resolves 200 even when steps failed, because it is NOT atomic — each
 * delegated production function opens its own transaction. Rendering a flat
 * "success" here would be actively misleading, so the header reflects the worst
 * step and every refusal is shown with the reason the production function gave.
 */
function ResetResult({ result }: { result: QaResetAccountResponse }) {
  const steps = result.steps ?? [];
  const failed = steps.filter((s) => s.status === QaResetStepStatus.Failed);

  const body = (
    <div className="space-y-3">
      {failed.length > 0 && (
        <p>
          The overall call succeeded, but {failed.length} step
          {failed.length === 1 ? '' : 's'} {failed.length === 1 ? 'was' : 'were'} refused by the
          production function. The usual case is a pool OWNER, whom leaving correctly refuses —
          the account delete then handles that membership through its own path, so this is normal
          rather than a broken reset.
        </p>
      )}
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={`${s.step}-${s.targetId ?? i}`} className="rounded-md border p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{RESET_STEP_LABELS[s.step] ?? s.step}</span>
              <ResetStepBadge status={s.status} />
            </div>
            {s.targetId && (
              <div className="mt-1 font-mono text-xs text-muted-foreground">{s.targetId}</div>
            )}
            {s.detail && <p className="mt-1 text-xs">{s.detail}</p>}
          </li>
        ))}
      </ul>
      {result.replacementUserId && (
        <div className="rounded-md border p-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Replacement account
          </div>
          <div className="text-sm">{result.replacementEmail ?? '—'}</div>
          <div className="font-mono text-xs text-muted-foreground">{result.replacementUserId}</div>
        </div>
      )}
    </div>
  );

  return failed.length > 0 ? (
    <WarningAlert title={`Reset finished — ${failed.length} step refused`}>{body}</WarningAlert>
  ) : (
    <SuccessAlert title="Reset finished">{body}</SuccessAlert>
  );
}

function ResetAccountCard() {
  const [user, setUser] = useState<PickedUser[]>([]);
  const [recreate, setRecreate] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const action = useQaAction<QaResetAccountResponse>();

  const phraseMatches = confirmation === QA_RESET_ACCOUNT_CONFIRMATION;
  const ready = user.length === 1 && phraseMatches;

  return (
    <Card className="border-2 border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <UserRoundX className="h-4 w-4" />
          Reset an account
        </CardTitle>
        <CardDescription className="text-destructive/90">
          <strong>Destructive and irreversible.</strong> Leaves every active pool, then runs the
          real anonymizing account delete. Composed from production functions only — so it is{' '}
          <strong>not atomic</strong> and reports each step separately. Refuses a platform admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UserPicker
          label="Account to reset"
          selected={user}
          onChange={setUser}
          max={1}
          disabled={action.busy}
        />

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={recreate}
            disabled={action.busy}
            onChange={(e) => setRecreate(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Recreate afterwards
            <span className="block text-xs text-muted-foreground">
              Mints a fresh synthetic replacement through the same path as synthetic users. The
              original account is still anonymized — this is a new account, not a restore.
            </span>
          </span>
        </label>

        <ConfirmPhraseInput
          id="qa-reset-confirm"
          phrase={QA_RESET_ACCOUNT_CONFIRMATION}
          value={confirmation}
          onChange={setConfirmation}
          disabled={action.busy}
        />

        <Button
          type="button"
          variant="destructive"
          disabled={!ready || action.busy}
          onClick={() => {
            const target = user[0];
            if (!target) return;
            if (
              !window.confirm(
                `Permanently reset ${target.name}?\n\nThe account is anonymized by the real delete path. This cannot be undone.`,
              )
            ) {
              return;
            }
            void action.run(
              () =>
                qaApi.state.resetAccount({ userId: target.id, recreate, confirmation }),
              (err, statusCode) => {
                if (statusCode === 409) {
                  return `Refused — that account is a platform admin. Admin access is governed by grant/revoke, not by resetting the account. (${err.message})`;
                }
                if (statusCode === 404) return `No such user. (${err.message})`;
                return null;
              },
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Reset account
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <ResetResult result={action.result} />}
      </CardContent>
    </Card>
  );
}

// ─── Forced pool status (bypasses the app) ────────────────────────────────────

function ForcePoolStatusCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [status, setStatus] = useState<PoolStatus>(PoolStatus.Closed);
  const [confirmation, setConfirmation] = useState('');
  const action = useQaAction<QaPoolStatusResponse>();

  // Strict equality, no trim or case-folding — the server compares the same way
  // and 400s on anything else.
  const phraseMatches = confirmation === QA_FORCE_POOL_STATUS_CONFIRMATION;
  const ready = Boolean(pool) && phraseMatches;

  return (
    <Card className="border-2 border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <TriangleAlert className="h-4 w-4" />
          Force pool status
        </CardTitle>
        <CardDescription className="text-destructive/90">
          <strong>This is the one control that bypasses the app.</strong> Every other action here
          runs real product code; this one writes the status column directly, so it can reach states
          the product cannot — no production function performs CLOSED → ACTIVE — and it does{' '}
          <strong>not reconcile derived state</strong>. Force a funded pool to CLOSED and its
          balance stays put, where a real close would have zeroed it. It deletes nothing — it is
          destructive to <strong>truth</strong> rather than to data, which is why it is confirmed
          like the destructive controls: the cost of a careless click is not a lost row, it is
          hours spent chasing a bug that was never real.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <FormField
          label="New status"
          htmlFor="qa-force-status"
          hint="There is no actor — this endpoint executes as nobody, because it delegates to nothing."
        >
          <Select value={status} onValueChange={(v) => setStatus(v as PoolStatus)}>
            <SelectTrigger id="qa-force-status" className="sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PoolStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {humanizeEnum(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <ConfirmPhraseInput
          id="qa-force-status-confirm"
          phrase={QA_FORCE_POOL_STATUS_CONFIRMATION}
          value={confirmation}
          onChange={setConfirmation}
          disabled={action.busy}
        />

        <Button
          type="button"
          variant="destructive"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool) return;
            if (
              !window.confirm(
                `Force "${pool.name}" to ${status}?\n\nThis bypasses the app. Derived state (balances, settlements, memberships) will NOT be reconciled, and a bug seen only from a forced state may not be a real bug.`,
              )
            ) {
              return;
            }
            void action.run(
              () => qaApi.state.poolStatus({ poolId: pool.id, status, confirmation }),
              (err, statusCode) => (statusCode === 404 ? `No such pool. (${err.message})` : null),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Force status
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <ForcedStatusResult result={action.result} />}
      </CardContent>
    </Card>
  );
}

/**
 * The forced-status outcome.
 *
 * `warning` is returned in the payload specifically so the caveat travels with
 * the response rather than living only in docs — so it is rendered VERBATIM,
 * at the same visual weight as the destructive controls themselves, never as a
 * muted caption.
 */
function ForcedStatusResult({ result }: { result: QaPoolStatusResponse }) {
  return (
    <div className="space-y-2">
      <SuccessAlert title="Status forced">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{humanizeEnum(result.previousStatus)}</Badge>
          <ArrowRight className="h-3.5 w-3.5" />
          <Badge variant="destructive">{humanizeEnum(result.status)}</Badge>
          {result.forced && <Badge variant="outline">Forced</Badge>}
        </div>
      </SuccessAlert>

      <Alert variant="destructive" className="border-2">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>This pool is now in a forced state</AlertTitle>
        <AlertDescription className="mt-1">{result.warning}</AlertDescription>
      </Alert>
    </div>
  );
}

// ─── Synthetic users ──────────────────────────────────────────────────────────

function SyntheticUsersCard({ max }: { max: number }) {
  const [count, setCount] = useState('3');
  const action = useQaAction<QaSyntheticUsersResponse>();

  const parsed = Number(count);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= max;
  const result = action.result;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRoundPlus className="h-4 w-4" />
          Synthetic users
        </CardTitle>
        <CardDescription>
          Mints throwaway staging accounts through the real find-or-create path, to play the other
          side of a multi-user flow. They appear in every picker on this page immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="How many" htmlFor="qa-synthetic-count" hint={`1–${max} per call.`}>
          <Input
            id="qa-synthetic-count"
            value={count}
            disabled={action.busy}
            onChange={(e) => setCount(e.target.value)}
            inputMode="numeric"
            className="sm:w-32"
          />
        </FormField>

        <Button
          type="button"
          disabled={!valid || action.busy}
          onClick={() => void action.run(() => qaApi.state.syntheticUsers({ count: parsed }))}
        >
          {action.busy && <BusySpinner />}
          Create users
        </Button>

        <ErrorAlert message={action.error} />
        {result && (
          <SuccessAlert title={`Created ${result.createdCount} users`}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>User id</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(result.userIds ?? []).map((id, i) => (
                    <TableRow key={id}>
                      <TableCell className="text-xs">{result.emails?.[i] ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Shared result rendering ──────────────────────────────────────────────────

/**
 * Row counts after a seed/wipe. `preservedUserCount` is called out separately —
 * it is the number of admin/allowlisted accounts deliberately kept, and the one
 * figure that confirms the operator did not delete their own access.
 */
function SeedResult({ result }: { result: QaSeedResponse }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Users" value={result.userCount} />
        <Stat label="Pools" value={result.poolCount} />
        <Stat label="Transactions" value={result.transactionCount} />
      </div>
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Preserved accounts
        </div>
        <div className="text-lg font-semibold">{result.preservedUserCount}</div>
        <p className="text-xs text-muted-foreground">
          Platform admins and allowlisted users deliberately kept — your own access is in here.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/** A label + monospaced id row, for ids the operator may need to copy. */
function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-xs">{value}</dd>
    </div>
  );
}

// ─── Seed (destructive) ───────────────────────────────────────────────────────

function SeedCard() {
  const [confirmation, setConfirmation] = useState('');
  const action = useQaAction<QaSeedResponse>();

  const phraseMatches = confirmation === QA_SEED_CONFIRMATION;

  return (
    <Card className="border-2 border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Sprout className="h-4 w-4" />
          Reseed demo data
        </CardTitle>
        <CardDescription className="text-destructive/90">
          <strong>Destructive and irreversible.</strong> Re-runs the demo seed, which{' '}
          <strong>wipes first</strong> — anything a teammate is mid-test on is gone. Platform admins
          and allowlisted accounts are preserved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfirmPhraseInput
          id="qa-seed-confirm"
          phrase={QA_SEED_CONFIRMATION}
          value={confirmation}
          onChange={setConfirmation}
          disabled={action.busy}
        />

        <Button
          type="button"
          variant="destructive"
          disabled={!phraseMatches || action.busy}
          onClick={() => {
            if (
              !window.confirm(
                'This WIPES the demo data and reseeds it. Everyone else testing on staging loses their state. Continue?',
              )
            ) {
              return;
            }
            void action.run(() => qaApi.state.seedDemo({ confirmation }));
          }}
        >
          {action.busy && <BusySpinner />}
          Wipe and reseed
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Staging reseeded">
            <SeedResult result={action.result} />
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Wipe (destructive) ───────────────────────────────────────────────────────

function WipeCard() {
  const [confirmation, setConfirmation] = useState('');
  const action = useQaAction<QaSeedResponse>();

  const phraseMatches = confirmation === QA_WIPE_CONFIRMATION;

  return (
    <Card className="border-2 border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Bomb className="h-4 w-4" />
          Wipe demo data
        </CardTitle>
        <CardDescription className="text-destructive/90">
          <strong>Destructive and irreversible.</strong> Deletes the demo data and leaves staging
          empty — no reseed follows. Platform admins and allowlisted accounts are preserved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfirmPhraseInput
          id="qa-wipe-confirm"
          phrase={QA_WIPE_CONFIRMATION}
          value={confirmation}
          onChange={setConfirmation}
          disabled={action.busy}
        />

        <Button
          type="button"
          variant="destructive"
          disabled={!phraseMatches || action.busy}
          onClick={() => {
            if (
              !window.confirm(
                'This DELETES the staging demo data and does NOT reseed. Staging will be empty. Continue?',
              )
            ) {
              return;
            }
            void action.run(() => qaApi.state.wipeDemo({ confirmation }));
          }}
        >
          {action.busy && <BusySpinner />}
          Wipe staging data
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Staging wiped">
            <SeedResult result={action.result} />
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}
