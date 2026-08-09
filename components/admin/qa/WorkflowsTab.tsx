'use client';

import { useState } from 'react';
import { Archive, Handshake, Receipt, UserPlus, Users } from 'lucide-react';

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
import { qaApi } from '@/lib/admin/adminApi';
import { humanizeEnum, parseDollarsToCents } from '@/lib/admin/format';
import {
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategory,
  SettlementMethod,
  type QaStatus,
  type QaWorkflowResponse,
} from '@/lib/admin/types';
import { PoolPicker, type PickedPool } from './PoolPicker';
import { UserPicker, type PickedUser } from '../UserPicker';
import {
  ActingUserFrame,
  BusySpinner,
  ErrorAlert,
  FormField,
  IdList,
  MoneyField,
  SuccessAlert,
  WarningAlert,
  useQaAction,
} from './primitives';

/**
 * Workflows tab: drive real multi-user flows from one seat instead of
 * coordinating two phones.
 *
 * Every workflow delegates to the exact production function, which enforces its
 * own authorization unchanged — the console bypasses no permission check. So
 * each form separates the ACTOR (who the API executes as — amber frame) from
 * the target, and states the permission the actor needs, because swapping the
 * two is the most common way these calls fail confusingly.
 *
 * All five answer with the SAME shape: `{ workflow, resultIds[] }`.
 */

export function WorkflowsTab({ status }: { status: QaStatus }) {
  const max = status.limits.maxSelectedUsers;
  return (
    <div className="space-y-6">
      <PoolInviteCard max={max} />
      <FriendRequestCard max={max} />
      <LogExpenseCard />
      <SettlementCard />
      <ClosePoolCard />
    </div>
  );
}

/** Uniform success rendering for every workflow response. */
function WorkflowResult({ result }: { result: QaWorkflowResponse }) {
  const ids = result.resultIds ?? [];
  return (
    <SuccessAlert title={`Ran ${humanizeEnum(result.workflow)}`}>
      {ids.length > 0 ? (
        <IdList label="Created ids" ids={ids} />
      ) : (
        <p>Completed — the workflow produced no ids.</p>
      )}
    </SuccessAlert>
  );
}

// ─── Pool invite ──────────────────────────────────────────────────────────────

function PoolInviteCard({ max }: { max: number }) {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [invitees, setInvitees] = useState<PickedUser[]>([]);
  const action = useQaAction<QaWorkflowResponse>();

  const ready = Boolean(pool) && actor.length === 1 && invitees.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Pool invite
        </CardTitle>
        <CardDescription>
          Invites members as if the actor tapped invite in the app. Inviting is gated to the pool
          OWNER and admins granted INVITE_MEMBERS — a plain member gets a 403.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <ActingUserFrame>
          <UserPicker
            label="Actor (must be able to invite in this pool)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <UserPicker
          label="Invitees (who gets invited)"
          selected={invitees}
          onChange={setInvitees}
          max={max}
          disabled={action.busy}
          allowAddAll
        />

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actor[0]) return;
            void action.run(() =>
              qaApi.workflows.poolInvite({
                actorUserId: actor[0].id,
                poolId: pool.id,
                inviteeUserIds: invitees.map((i) => i.id),
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Invite {invitees.length} user{invitees.length === 1 ? '' : 's'}
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <WorkflowResult result={action.result} />}
      </CardContent>
    </Card>
  );
}

// ─── Friend request ───────────────────────────────────────────────────────────

function FriendRequestCard({ max }: { max: number }) {
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [targets, setTargets] = useState<PickedUser[]>([]);
  const action = useQaAction<QaWorkflowResponse>();

  const ready = actor.length === 1 && targets.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Friend request
        </CardTitle>
        <CardDescription>
          Sends friend requests FROM the actor TO everyone selected. There is no accept endpoint —
          accepting still happens in the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActingUserFrame>
          <UserPicker
            label="Actor (sends the requests)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <UserPicker
          label="Targets (receive the requests)"
          selected={targets}
          onChange={setTargets}
          max={max}
          disabled={action.busy}
          allowAddAll
        />

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!actor[0]) return;
            void action.run(() =>
              qaApi.workflows.friendRequest({
                actorUserId: actor[0].id,
                targetUserIds: targets.map((t) => t.id),
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Send {targets.length} request{targets.length === 1 ? '' : 's'}
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <WorkflowResult result={action.result} />}
      </CardContent>
    </Card>
  );
}

// ─── Log expense ──────────────────────────────────────────────────────────────

function LogExpenseCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.Dining);
  const action = useQaAction<QaWorkflowResponse>();

  const cents = parseDollarsToCents(amount);
  const merchant = merchantName.trim();
  const ready =
    Boolean(pool) &&
    actor.length === 1 &&
    cents !== null &&
    cents > 0 &&
    merchant.length > 0 &&
    merchant.length <= 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          Log expense
        </CardTitle>
        <CardDescription>
          Spends from the pool balance as the actor, through the real transaction service — the
          split and the balance move exactly as they would in the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <ActingUserFrame>
          <UserPicker
            label="Actor (the spender — must be a member of the pool)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <MoneyField
          id="qa-expense-amount"
          label="Amount"
          value={amount}
          onChange={setAmount}
          disabled={action.busy}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Merchant"
            htmlFor="qa-expense-merchant"
            hint={
              merchant.length > 100 ? (
                <span className="text-destructive">Max 100 characters</span>
              ) : (
                'Required.'
              )
            }
          >
            <Input
              id="qa-expense-merchant"
              value={merchantName}
              disabled={action.busy}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Trader Joe's"
            />
          </FormField>

          <FormField label="Category" htmlFor="qa-expense-category">
            <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger id="qa-expense-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ExpenseCategory).map((c) => (
                  <SelectItem key={c} value={c}>
                    {EXPENSE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actor[0] || cents === null) return;
            void action.run(() =>
              qaApi.workflows.logExpense({
                actorUserId: actor[0].id,
                poolId: pool.id,
                amountCents: cents,
                merchantName: merchant,
                category,
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Log expense
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <WorkflowResult result={action.result} />}
      </CardContent>
    </Card>
  );
}

// ─── Settlement ───────────────────────────────────────────────────────────────

function SettlementCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [debtor, setDebtor] = useState<PickedUser[]>([]);
  const [creditor, setCreditor] = useState<PickedUser[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<SettlementMethod>(SettlementMethod.Venmo);
  const action = useQaAction<QaWorkflowResponse>();

  const cents = parseDollarsToCents(amount);
  const actorId = actor[0]?.id ?? null;
  const debtorId = debtor[0]?.id ?? null;
  const creditorId = creditor[0]?.id ?? null;

  const actorIsDebtor = actorId !== null && actorId === debtorId;
  const actorIsCreditor = actorId !== null && actorId === creditorId;
  const actorIsNeither = actorId !== null && !actorIsDebtor && !actorIsCreditor;
  // The API rejects this outright (`fromUserId and toUserId must differ`).
  const samePerson = debtorId !== null && debtorId === creditorId;

  const ready =
    Boolean(pool) &&
    actorId !== null &&
    debtorId !== null &&
    creditorId !== null &&
    !samePerson &&
    cents !== null &&
    cents > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Handshake className="h-4 w-4" />
          Settlement (external repayment)
        </CardTitle>
        <CardDescription>
          Records an off-app repayment between two members. Who acts decides the outcome: the debtor
          marking &ldquo;sent&rdquo; leaves it PENDING until the creditor confirms, while the
          creditor marking &ldquo;received&rdquo; confirms immediately. Only a CONFIRMED settlement
          nets a balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <div className="grid gap-4 sm:grid-cols-2">
          <UserPicker
            label="From — debtor (owes the money)"
            selected={debtor}
            onChange={setDebtor}
            max={1}
            disabled={action.busy}
          />
          <UserPicker
            label="To — creditor (is owed the money)"
            selected={creditor}
            onChange={setCreditor}
            max={1}
            disabled={action.busy}
          />
        </div>

        <ActingUserFrame>
          <UserPicker
            label="Actor (normally the debtor or the creditor)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        {samePerson && <ErrorAlert message="Debtor and creditor must be different people." />}
        {actorIsDebtor && (
          <WarningAlert title="Will be created PENDING">
            <p>
              The actor is the debtor (&ldquo;I sent it&rdquo;), so the settlement stays PENDING and
              nets no balance until the creditor confirms it in the app — there is no confirm
              endpoint in this console.
            </p>
          </WarningAlert>
        )}
        {actorIsCreditor && (
          <WarningAlert title="Will confirm immediately">
            <p>
              The actor is the creditor (&ldquo;I received it&rdquo;), so the settlement confirms on
              creation and nets the balance right away.
            </p>
          </WarningAlert>
        )}
        {actorIsNeither && (
          <WarningAlert title="Actor is a third party">
            <p>
              The actor is neither the debtor nor the creditor. The settlement service enforces its
              own rules here, so expect this to be refused.
            </p>
          </WarningAlert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField
            id="qa-settlement-amount"
            label="Amount"
            value={amount}
            onChange={setAmount}
            disabled={action.busy}
            hint="Capped server-side by what is actually owed; pending settlements count against that cap."
          />
          <FormField label="Method" htmlFor="qa-settlement-method">
            <Select value={method} onValueChange={(v) => setMethod(v as SettlementMethod)}>
              <SelectTrigger id="qa-settlement-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SettlementMethod).map((m) => (
                  <SelectItem key={m} value={m}>
                    {humanizeEnum(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actorId || !debtorId || !creditorId || cents === null) return;
            void action.run(() =>
              qaApi.workflows.settlement({
                actorUserId: actorId,
                poolId: pool.id,
                fromUserId: debtorId,
                toUserId: creditorId,
                amountCents: cents,
                method,
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Record settlement
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <WorkflowResult result={action.result} />}
      </CardContent>
    </Card>
  );
}

// ─── Close pool ───────────────────────────────────────────────────────────────

function ClosePoolCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const action = useQaAction<QaWorkflowResponse>();

  const ready = Boolean(pool) && actor.length === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="h-4 w-4" />
          Close pool
        </CardTitle>
        <CardDescription>
          The only pool-state transition this console offers. Closing is owner/admin-gated
          (CLOSE_POOL), and the real service decides whether a pool with a live balance may close.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <ActingUserFrame>
          <UserPicker
            label="Actor (needs permission to close this pool)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <Button
          type="button"
          variant="destructive"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actor[0]) return;
            if (!window.confirm(`Close "${pool.name}"?`)) return;
            void action.run(() =>
              qaApi.workflows.closePool({ actorUserId: actor[0].id, poolId: pool.id }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Close pool
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <WorkflowResult result={action.result} />}
      </CardContent>
    </Card>
  );
}
