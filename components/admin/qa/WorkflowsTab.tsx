'use client';

import { useState } from 'react';
import { ArrowRight, Handshake, Receipt, UserPlus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { qaApi } from '@/lib/admin/adminApi';
import { parseDollarsToCents } from '@/lib/admin/format';
import type {
  QaWorkflowFriendRequestResult,
  QaWorkflowMemberResult,
  QaWorkflowOkResult,
  QaWorkflowSettlementResult,
  QaWorkflowTransactionResult,
} from '@/lib/admin/types';
import { PoolPicker, type PickedPool } from './PoolPicker';
import { UserPicker, type PickedUser } from './UserPicker';
import {
  ActingUserFrame,
  BusySpinner,
  ErrorAlert,
  FormField,
  KeyValueRows,
  MoneyField,
  SuccessAlert,
  WarningAlert,
  useQaAction,
} from './primitives';

/**
 * Workflows tab: drive real multi-user flows from one seat instead of
 * coordinating two phones.
 *
 * Every form separates the ACTING user (who the API executes as — amber frame)
 * from the TARGET. Swapping the two is the single most common way these calls
 * fail confusingly, so the constraints are surfaced as helper text and
 * client-side guards BEFORE the request, not as a server error afterwards.
 */

export function WorkflowsTab() {
  // Ids produced by one workflow feed the next, so the operator never has to
  // copy a cuid out of a JSON blob by hand.
  const [lastFriendshipId, setLastFriendshipId] = useState('');
  const [lastSettlementId, setLastSettlementId] = useState('');

  return (
    <div className="space-y-6">
      <PoolInviteCard />
      <FriendRequestCard onCreated={setLastFriendshipId} />
      <FriendAcceptCard suggestedId={lastFriendshipId} />
      <LogExpenseCard />
      <SettlementCard onCreated={setLastSettlementId} />
      <SettlementDecisionCard suggestedId={lastSettlementId} />
    </div>
  );
}

// ─── Pool invite ──────────────────────────────────────────────────────────────

function PoolInviteCard() {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [identifier, setIdentifier] = useState('');
  const action = useQaAction<QaWorkflowMemberResult>();

  const ready = Boolean(pool) && actor.length === 1 && identifier.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Pool invite
        </CardTitle>
        <CardDescription>
          Invite someone to a pool as if the acting user tapped invite in the app. Inviting is gated
          to the pool OWNER and admins granted INVITE_MEMBERS — a plain member gets a 403.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <ActingUserFrame>
          <UserPicker
            label="Inviter (must be able to invite in this pool)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <FormField
          label="Invitee identifier"
          htmlFor="qa-invite-identifier"
          hint="Email or username of the person being invited — NOT the inviter."
        >
          <Input
            id="qa-invite-identifier"
            value={identifier}
            disabled={action.busy}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="friend@example.com"
          />
        </FormField>

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actor[0]) return;
            void action.run(() =>
              qaApi.workflows.poolInvite({
                poolId: pool.id,
                actingUserId: actor[0].id,
                identifier: identifier.trim(),
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Send invite
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Invite created">
            <KeyValueRows data={action.result.member ?? {}} />
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Friend request ───────────────────────────────────────────────────────────

function FriendRequestCard({ onCreated }: { onCreated: (id: string) => void }) {
  const [requester, setRequester] = useState<PickedUser[]>([]);
  const [identifier, setIdentifier] = useState('');
  const action = useQaAction<QaWorkflowFriendRequestResult>();

  // Captured as a const so it stays narrowed inside the callbacks below.
  const created = action.result;
  const ready = requester.length === 1 && identifier.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Friend request
        </CardTitle>
        <CardDescription>
          Sends a friend request FROM the requester TO the identified user. The returned friendship
          id is carried into the accept form below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActingUserFrame>
          <UserPicker
            label="Requester (sends the request)"
            selected={requester}
            onChange={setRequester}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <FormField
          label="Recipient identifier"
          htmlFor="qa-friend-identifier"
          hint="Email or username of the person receiving the request."
        >
          <Input
            id="qa-friend-identifier"
            value={identifier}
            disabled={action.busy}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="friend@example.com"
          />
        </FormField>

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            const from = requester[0];
            if (!from) return;
            void action.run(() =>
              qaApi.workflows.friendRequest({
                requesterId: from.id,
                identifier: identifier.trim(),
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Send friend request
        </Button>

        <ErrorAlert message={action.error} />
        {created && (
          <SuccessAlert title="Friend request sent">
            <div className="space-y-2">
              <KeyValueRows data={{ friendshipId: created.friendshipId }} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onCreated(created.friendshipId)}
              >
                <ArrowRight className="mr-2 h-3.5 w-3.5" />
                Use this id in the accept form
              </Button>
            </div>
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Friend accept ────────────────────────────────────────────────────────────

function FriendAcceptCard({ suggestedId }: { suggestedId: string }) {
  const [responder, setResponder] = useState<PickedUser[]>([]);
  const [friendshipId, setFriendshipId] = useState('');
  const action = useQaAction<QaWorkflowOkResult>();

  const effectiveId = friendshipId || suggestedId;
  const ready = responder.length === 1 && effectiveId.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Handshake className="h-4 w-4" />
          Friend accept
        </CardTitle>
        <CardDescription>
          Accepts a pending request. The responder is the person who RECEIVED it — passing the
          requester here will fail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActingUserFrame>
          <UserPicker
            label="Responder (received the request)"
            selected={responder}
            onChange={setResponder}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <FormField
          label="Friendship id"
          htmlFor="qa-friendship-id"
          hint={
            suggestedId && !friendshipId
              ? `Using the id from the request above: ${suggestedId}`
              : 'Returned by the friend-request workflow.'
          }
        >
          <Input
            id="qa-friendship-id"
            value={friendshipId}
            disabled={action.busy}
            onChange={(e) => setFriendshipId(e.target.value)}
            placeholder={suggestedId || 'friendship id'}
            className="font-mono text-xs"
          />
        </FormField>

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            const who = responder[0];
            if (!who) return;
            void action.run(() =>
              qaApi.workflows.friendAccept({
                responderId: who.id,
                friendshipId: effectiveId.trim(),
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Accept request
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <SuccessAlert title="Friend request accepted" />}
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
  const [note, setNote] = useState('');
  const action = useQaAction<QaWorkflowTransactionResult>();

  const cents = parseDollarsToCents(amount);
  const ready = Boolean(pool) && actor.length === 1 && cents !== null && cents > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          Log expense
        </CardTitle>
        <CardDescription>
          Spends from the pool balance as the acting user. This moves real (simulated-ledger) money
          and splits it across the pool roster.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PoolPicker selected={pool} onChange={setPool} disabled={action.busy} />

        <ActingUserFrame>
          <UserPicker
            label="Spender (must be a member of the pool)"
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
          <FormField label="Merchant (optional)" htmlFor="qa-expense-merchant">
            <Input
              id="qa-expense-merchant"
              value={merchantName}
              disabled={action.busy}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Trader Joe's"
            />
          </FormField>
          <FormField label="Note (optional)" htmlFor="qa-expense-note">
            <Input
              id="qa-expense-note"
              value={note}
              disabled={action.busy}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
        </div>

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actor[0] || cents === null) return;
            void action.run(() =>
              qaApi.workflows.logExpense({
                actingUserId: actor[0].id,
                poolId: pool.id,
                amountCents: cents,
                merchantName: merchantName.trim() || undefined,
                note: note.trim() || undefined,
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Log expense
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Expense logged">
            <KeyValueRows data={action.result.transaction ?? {}} />
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Settlement create ────────────────────────────────────────────────────────

function SettlementCard({ onCreated }: { onCreated: (id: string) => void }) {
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [debtor, setDebtor] = useState<PickedUser[]>([]);
  const [creditor, setCreditor] = useState<PickedUser[]>([]);
  const [amount, setAmount] = useState('');
  const action = useQaAction<QaWorkflowSettlementResult>();

  // Captured as a const so it stays narrowed inside the callbacks below.
  const created = action.result;
  const cents = parseDollarsToCents(amount);
  const actorId = actor[0]?.id ?? null;
  const debtorId = debtor[0]?.id ?? null;
  const creditorId = creditor[0]?.id ?? null;

  const actingIsDebtor = actorId !== null && actorId === debtorId;
  const actingIsCreditor = actorId !== null && actorId === creditorId;
  const actingIsNeither = actorId !== null && !actingIsDebtor && !actingIsCreditor;
  const sameParty = debtorId !== null && debtorId === creditorId;

  const ready =
    Boolean(pool) &&
    actorId !== null &&
    debtorId !== null &&
    creditorId !== null &&
    !sameParty &&
    !actingIsNeither &&
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
          marking &ldquo;sent&rdquo; leaves it PENDING for the creditor to confirm, while the
          creditor marking &ldquo;received&rdquo; confirms instantly.
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
            label="Acting user (must be the debtor or the creditor)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        {sameParty && (
          <ErrorAlert message="Debtor and creditor must be different people." />
        )}
        {actingIsNeither && (
          <ErrorAlert message="The acting user must be either the debtor or the creditor — a third party cannot record this settlement." />
        )}
        {actingIsDebtor && (
          <WarningAlert title="Will be created PENDING">
            <p>
              The acting user is the debtor (&ldquo;I sent it&rdquo;), so the settlement stays
              PENDING and nets no balance until the creditor confirms it below.
            </p>
          </WarningAlert>
        )}
        {actingIsCreditor && (
          <WarningAlert title="Will confirm immediately">
            <p>
              The acting user is the creditor (&ldquo;I received it&rdquo;), so the settlement
              confirms on creation and nets the balance right away.
            </p>
          </WarningAlert>
        )}

        <MoneyField
          id="qa-settlement-amount"
          label="Amount"
          value={amount}
          onChange={setAmount}
          disabled={action.busy}
          hint="Capped server-side by what is actually owed (pending settlements count against the cap)."
        />

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() => {
            if (!pool || !actorId || !debtorId || !creditorId || cents === null) return;
            void action.run(() =>
              qaApi.workflows.settlement({
                actingUserId: actorId,
                poolId: pool.id,
                fromUserId: debtorId,
                toUserId: creditorId,
                amountCents: cents,
              }),
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Record settlement
        </Button>

        <ErrorAlert message={action.error} />
        {created && (
          <SuccessAlert title="Settlement recorded">
            <div className="space-y-2">
              <KeyValueRows data={created.settlement ?? {}} />
              {created.settlement?.id && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onCreated(String(created.settlement.id))}
                >
                  <ArrowRight className="mr-2 h-3.5 w-3.5" />
                  Use this id below
                </Button>
              )}
            </div>
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Settlement confirm / reject ──────────────────────────────────────────────

function SettlementDecisionCard({ suggestedId }: { suggestedId: string }) {
  const [settlementId, setSettlementId] = useState('');
  const [actor, setActor] = useState<PickedUser[]>([]);
  const action = useQaAction<QaWorkflowSettlementResult>();

  const effectiveId = settlementId || suggestedId;
  const ready = actor.length === 1 && effectiveId.trim().length > 0;

  const decide = (decision: 'confirm' | 'reject') => {
    const who = actor[0];
    if (!who) return;
    if (
      !window.confirm(
        `${decision === 'confirm' ? 'Confirm' : 'Reject'} settlement ${effectiveId.trim()}?`,
      )
    ) {
      return;
    }
    void action.run(
      () =>
        decision === 'confirm'
          ? qaApi.workflows.confirmSettlement(effectiveId.trim(), { actingUserId: who.id })
          : qaApi.workflows.rejectSettlement(effectiveId.trim(), { actingUserId: who.id }),
      (err, statusCode) =>
        statusCode === 409
          ? `Already decided by someone else (race) — this settlement is no longer PENDING. (${err.message})`
          : null,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confirm / reject a pending settlement</CardTitle>
        <CardDescription>
          Only the creditor can decide a settlement the debtor marked as sent. A 409 means someone
          already decided it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          label="Settlement id"
          htmlFor="qa-settlement-id"
          hint={
            suggestedId && !settlementId
              ? `Using the id from the settlement above: ${suggestedId}`
              : undefined
          }
        >
          <Input
            id="qa-settlement-id"
            value={settlementId}
            disabled={action.busy}
            onChange={(e) => setSettlementId(e.target.value)}
            placeholder={suggestedId || 'settlement id'}
            className="font-mono text-xs"
          />
        </FormField>

        <ActingUserFrame>
          <UserPicker
            label="Acting user (the creditor being repaid)"
            selected={actor}
            onChange={setActor}
            max={1}
            disabled={action.busy}
          />
        </ActingUserFrame>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!ready || action.busy} onClick={() => decide('confirm')}>
            {action.busy && <BusySpinner />}
            Confirm received
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!ready || action.busy}
            onClick={() => decide('reject')}
          >
            Reject
          </Button>
        </div>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SuccessAlert title="Settlement updated">
            <KeyValueRows data={action.result.settlement ?? {}} />
          </SuccessAlert>
        )}
      </CardContent>
    </Card>
  );
}
