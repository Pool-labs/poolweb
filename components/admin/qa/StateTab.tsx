'use client';

import { useState } from 'react';
import { Banknote, Bomb, ToggleLeft, UserRoundPlus } from 'lucide-react';

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
import { humanizeEnum, parseDollarsToCents } from '@/lib/admin/format';
import {
  PoolStatus,
  QA_MAX_SYNTHETIC_USERS,
  QA_SEED_DEMO_CONFIRMATION,
  type QaDepositResult,
  type QaPoolStatusResult,
  type QaSeedCounts,
  type QaSeedDemoResult,
  type QaSyntheticUsersResult,
} from '@/lib/admin/types';
import { PoolPicker, type PickedPool } from './PoolPicker';
import { UserPicker, type PickedUser } from './UserPicker';
import {
  ActingUserFrame,
  BusySpinner,
  ConfirmPhraseInput,
  ErrorAlert,
  FormField,
  KeyValueRows,
  MoneyField,
  SuccessAlert,
  isRecord,
  useQaAction,
} from './primitives';

/**
 * State tab: manufacture the preconditions a test needs — throwaway accounts,
 * funded pools, a closed pool — plus the nuclear reseed.
 */

export function StateTab() {
  return (
    <div className="space-y-6">
      <SyntheticUsersCard />
      <DepositCard />
      <PoolStatusCard />
      <SeedDemoCard />
    </div>
  );
}

// ─── Synthetic users ──────────────────────────────────────────────────────────

function SyntheticUsersCard() {
  const [count, setCount] = useState('3');
  const action = useQaAction<QaSyntheticUsersResult>();

  const parsed = Number(count);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= QA_MAX_SYNTHETIC_USERS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRoundPlus className="h-4 w-4" />
          Synthetic users
        </CardTitle>
        <CardDescription>
          Creates throwaway staging accounts to play the other side of a multi-user flow. They show
          up in every picker on this page immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          label="How many"
          htmlFor="qa-synthetic-count"
          hint={`1–${QA_MAX_SYNTHETIC_USERS} per call.`}
        >
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
          Create {valid ? parsed : ''} user{parsed === 1 ? '' : 's'}
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title={`Created ${action.result.users?.length ?? 0} users`}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>User id</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(action.result.users ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {u.id}
                      </TableCell>
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

// ─── Deposit ──────────────────────────────────────────────────────────────────

function DepositCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [user, setUser] = useState<PickedUser[]>([]);
  const [amount, setAmount] = useState('');
  const action = useQaAction<QaDepositResult>();

  const cents = parseDollarsToCents(amount);
  const ready = Boolean(pool) && user.length === 1 && cents !== null && cents > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4" />
          Deposit into a pool
        </CardTitle>
        <CardDescription>
          Funds a pool on a member&apos;s behalf through the simulated deposit ledger, so there is a
          balance to spend against.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <UserPicker
          label="Depositing member"
          selected={user}
          onChange={setUser}
          max={1}
          disabled={action.busy}
          hint="The deposit is credited to this member — they must belong to the pool."
        />

        <MoneyField
          id="qa-deposit-amount"
          label="Amount"
          value={amount}
          onChange={setAmount}
          disabled={action.busy}
        />

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !user[0] || cents === null) return;
            void action.run(() =>
              qaApi.state.deposit({ poolId: pool.id, userId: user[0].id, amountCents: cents }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Deposit
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Deposit recorded">
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Deposit</div>
                <KeyValueRows data={action.result.deposit ?? {}} />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Pool</div>
                <KeyValueRows data={action.result.pool ?? {}} />
              </div>
            </div>
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Pool status ──────────────────────────────────────────────────────────────

function PoolStatusCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [status, setStatus] = useState<PoolStatus>(PoolStatus.Active);
  const action = useQaAction<QaPoolStatusResult>();

  const ready = Boolean(pool) && actor.length === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ToggleLeft className="h-4 w-4" />
          Pool status
        </CardTitle>
        <CardDescription>
          Moves a pool between ACTIVE / CLOSED / ARCHIVED as the acting user, for testing the
          closed-pool and archived-pool states.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <ActingUserFrame>
          <UserPicker
            label="Acting user (needs permission on this pool)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
            hint="Closing a pool is owner/admin-gated — a plain member will be refused."
          />
        </ActingUserFrame>

        <FormField label="New status" htmlFor="qa-pool-status">
          <Select value={status} onValueChange={(v) => setStatus(v as PoolStatus)}>
            <SelectTrigger id="qa-pool-status" className="sm:w-64">
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

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actor[0]) return;
            if (!window.confirm(`Set "${pool.name}" to ${status}?`)) return;
            void action.run(() =>
              qaApi.state.poolStatus({ poolId: pool.id, actingUserId: actor[0].id, status }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Apply status
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Pool status updated">
            <KeyValueRows data={action.result.pool ?? {}} />
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Seed demo (destructive) ──────────────────────────────────────────────────

/** Seed counts arrive either as a total or a per-entity breakdown. */
function SeedCounts({ label, counts }: { label: string; counts: QaSeedCounts }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide">{label}</div>
      {isRecord(counts) ? (
        <KeyValueRows data={counts} />
      ) : (
        <p className="text-sm">{String(counts)} records</p>
      )}
    </div>
  );
}

function SeedDemoCard() {
  const [confirmation, setConfirmation] = useState('');
  const action = useQaAction<QaSeedDemoResult>();

  const phraseMatches = confirmation === QA_SEED_DEMO_CONFIRMATION;

  return (
    <Card className="border-2 border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Bomb className="h-4 w-4" />
          Wipe &amp; reseed demo data
        </CardTitle>
        <CardDescription className="text-destructive/90">
          <strong>Destructive and irreversible.</strong> This deletes ALL non-admin staging data —
          every user, pool, transaction and settlement that is not a platform admin — and replaces
          it with the demo seed. Anything a teammate is mid-test on is gone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfirmPhraseInput
          id="qa-seed-confirm"
          phrase={QA_SEED_DEMO_CONFIRMATION}
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
                'This WIPES all non-admin staging data and reseeds it. Everyone else testing on staging loses their state. Continue?',
              )
            ) {
              return;
            }
            void action.run(() => qaApi.state.seedDemo({ confirmation }));
          }}
        >
          {action.busy && <BusySpinner />}
          Wipe and reseed staging
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Staging reseeded">
            <div className="space-y-3">
              <SeedCounts label="Wiped" counts={action.result.wiped} />
              <SeedCounts label="Created" counts={action.result.created} />
            </div>
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}
