'use client';

import { useState } from 'react';
import { Bomb, Sprout, UserRoundPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { qaApi } from '@/lib/admin/adminApi';
import {
  QA_SEED_CONFIRMATION,
  QA_WIPE_CONFIRMATION,
  type QaSeedResponse,
  type QaStatus,
  type QaSyntheticUsersResponse,
} from '@/lib/admin/types';
import {
  BusySpinner,
  ConfirmPhraseInput,
  ErrorAlert,
  FormField,
  SuccessAlert,
  useQaAction,
} from './primitives';

/**
 * State tab: manufacture the preconditions a test needs.
 *
 * Seed and wipe are SEPARATE endpoints with SEPARATE confirmation phrases, so
 * neither can be reached by a typo in the other's box. Both report
 * `preservedUserCount` — the admin/allowlisted accounts a wipe deliberately
 * keeps — which is the number that answers "did I just lock us out?".
 */

export function StateTab({ status }: { status: QaStatus }) {
  return (
    <div className="space-y-6">
      <SyntheticUsersCard max={status.limits.maxSyntheticUsers} />
      <SeedCard />
      <WipeCard />
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
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
