'use client';

import { useState } from 'react';
import { BellRing, Megaphone, Radio } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { qaApi } from '@/lib/admin/adminApi';
import { parseDollarsToCents } from '@/lib/admin/format';
import {
  QA_BROADCAST_CONFIRMATION,
  QA_PUSH_BODY_MAX_CHARS,
  QA_PUSH_TITLE_MAX_CHARS,
  QaNotificationTemplate,
  type QaNotificationPreviewResponse,
  type QaNotificationSendResponse,
  type QaNotificationTriggerBody,
  type QaPushSendResponse,
  type QaStatus,
} from '@/lib/admin/types';
import { PoolPicker, type PickedPool } from './PoolPicker';
import { UserPicker, type PickedUser } from '../UserPicker';
import {
  ActingUserFrame,
  BusySpinner,
  ConfirmPhraseInput,
  ErrorAlert,
  FormField,
  MoneyField,
  SentResultAlert,
  checkPushCopy,
  useQaAction,
} from './primitives';

/**
 * Notifications tab.
 *
 * Two very different things live here, kept apart on purpose:
 *  - the four REAL transactional templates, whose bodies are a discriminated
 *    union on `template` (each demands exactly the context its builder needs),
 *    previewable per-recipient before sending;
 *  - arbitrary free-text push + the separate broadcast fan-out, the only place
 *    a human types copy that renders on a lock screen — hence the money-free
 *    copy rule, mirrored client-side so it fails while typing, not on submit.
 */

const TEMPLATE_LABELS: Record<QaNotificationTemplate, string> = {
  [QaNotificationTemplate.PoolInvite]: 'Pool invite',
  [QaNotificationTemplate.FriendRequest]: 'Friend request',
  [QaNotificationTemplate.FriendAccepted]: 'Friend accepted',
  [QaNotificationTemplate.ExpenseLogged]: 'Expense logged',
};

const TEMPLATE_HINTS: Record<QaNotificationTemplate, string> = {
  [QaNotificationTemplate.PoolInvite]: 'Needs the pool being invited to.',
  [QaNotificationTemplate.FriendRequest]:
    'Needs the actor whose name appears in the copy — resolved server-side, never sent as text.',
  [QaNotificationTemplate.FriendAccepted]: 'Needs the actor who accepted.',
  [QaNotificationTemplate.ExpenseLogged]: 'Needs the spender, the pool and the amount.',
};

export function NotificationsTab({ status }: { status: QaStatus }) {
  return (
    <div className="space-y-6">
      <TemplateSection status={status} />
      <PushSection status={status} />
      <BroadcastSection status={status} />
    </div>
  );
}

// ─── Real templates: preview → send ───────────────────────────────────────────

function TemplateSection({ status }: { status: QaStatus }) {
  const templates = status.notificationTemplates ?? [];
  const [template, setTemplate] = useState<QaNotificationTemplate>(
    templates[0] ?? QaNotificationTemplate.PoolInvite,
  );
  const [recipients, setRecipients] = useState<PickedUser[]>([]);
  const [actor, setActor] = useState<PickedUser[]>([]);
  const [pool, setPool] = useState<PickedPool | null>(null);
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const preview = useQaAction<QaNotificationPreviewResponse>();
  const send = useQaAction<QaNotificationSendResponse>();

  const needsActor =
    template === QaNotificationTemplate.FriendRequest ||
    template === QaNotificationTemplate.FriendAccepted ||
    template === QaNotificationTemplate.ExpenseLogged;
  const needsPool =
    template === QaNotificationTemplate.PoolInvite ||
    template === QaNotificationTemplate.ExpenseLogged;
  const needsAmount = template === QaNotificationTemplate.ExpenseLogged;

  const cents = parseDollarsToCents(amount);

  /**
   * Build the body FROM the discriminator, so a field the chosen template does
   * not take can never be attached — a `friend_request` body structurally
   * cannot carry a `poolId` here, mirroring the server's discriminated union.
   * Returns null while the required context for the chosen template is missing.
   */
  const buildBody = (): QaNotificationTriggerBody | null => {
    const recipientUserIds = recipients.map((r) => r.id);
    if (recipientUserIds.length === 0) return null;
    const actorUserId = actor[0]?.id;

    switch (template) {
      case QaNotificationTemplate.PoolInvite:
        return pool ? { template, recipientUserIds, poolId: pool.id } : null;
      case QaNotificationTemplate.FriendRequest:
      case QaNotificationTemplate.FriendAccepted:
        return actorUserId ? { template, recipientUserIds, actorUserId } : null;
      case QaNotificationTemplate.ExpenseLogged:
        return actorUserId && pool && cents !== null && cents > 0
          ? {
              template,
              recipientUserIds,
              actorUserId,
              poolId: pool.id,
              amountCents: cents,
              merchantName: merchantName.trim() || undefined,
              transactionId: transactionId.trim() || undefined,
            }
          : null;
      default:
        return null;
    }
  };

  const body = buildBody();
  const previews = preview.result?.previews ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4" />
          Transactional template
        </CardTitle>
        <CardDescription>
          Fires one of the four real notification templates. Preview returns the actual
          builder&apos;s output and send hands that identical payload to the production notifier —
          so what you see is what ships.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Template" htmlFor="qa-template" hint={TEMPLATE_HINTS[template]}>
          <Select
            value={template}
            onValueChange={(v) => {
              setTemplate(v as QaNotificationTemplate);
              preview.reset();
              send.reset();
            }}
          >
            <SelectTrigger id="qa-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(templates.length > 0 ? templates : Object.values(QaNotificationTemplate)).map(
                (t) => (
                  <SelectItem key={t} value={t}>
                    {TEMPLATE_LABELS[t] ?? t}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </FormField>

        <UserPicker
          label="Recipients (who receives the notification)"
          selected={recipients}
          onChange={setRecipients}
          max={status.limits.maxSelectedUsers}
          allowAddAll
        />

        {needsActor && (
          <ActingUserFrame>
            <UserPicker
              label="Actor (whose name appears in the copy)"
              selected={actor}
              onChange={setActor}
              max={1}
              hint="Resolved server-side from this id — the console never sends a name as text."
            />
          </ActingUserFrame>
        )}

        {needsPool && <PoolPicker selected={pool} onChange={setPool} />}

        {needsAmount && (
          <>
            <MoneyField
              id="qa-template-amount"
              label="Amount"
              value={amount}
              onChange={setAmount}
              hint="Passed to the real builder verbatim — the QA layer performs no math on it."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Merchant (optional)" htmlFor="qa-template-merchant">
                <Input
                  id="qa-template-merchant"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Trader Joe's"
                />
              </FormField>
              <FormField
                label="Transaction id (optional)"
                htmlFor="qa-template-txn"
                hint="Links the notification to an existing transaction."
              >
                <Input
                  id="qa-template-txn"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="font-mono text-xs"
                />
              </FormField>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!body || preview.busy}
            onClick={() => {
              if (!body) return;
              void preview.run(() => qaApi.notifications.preview(body));
            }}
          >
            {preview.busy && <BusySpinner />}
            Preview for {recipients.length} recipient{recipients.length === 1 ? '' : 's'}
          </Button>
          <Button
            type="button"
            disabled={!body || send.busy}
            onClick={() => {
              if (!body) return;
              void send.run(() => qaApi.notifications.send(body));
            }}
          >
            {send.busy && <BusySpinner />}
            Send
          </Button>
        </div>

        <ErrorAlert message={preview.error} />
        {previews.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Preview — {previews.length} payload{previews.length === 1 ? '' : 's'}
            </div>
            {previews.map((p) => {
              const willPush = p.pushTitle !== null && p.pushBody !== null;
              const name = recipients.find((r) => r.id === p.userId)?.name ?? p.userId;
              return (
                <div key={p.userId} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{name}</span>
                    <Badge variant={willPush ? 'default' : 'secondary'}>
                      {willPush ? 'Will push' : 'In-app only (no push copy)'}
                    </Badge>
                  </div>
                  <dl className="space-y-1 text-sm">
                    <PreviewRow label="Title" value={p.title} />
                    <PreviewRow label="Body" value={p.body} />
                    <PreviewRow label="Push title" value={p.pushTitle} />
                    <PreviewRow label="Push body" value={p.pushBody} />
                  </dl>
                </div>
              );
            })}
          </div>
        )}

        <ErrorAlert message={send.error} />
        {send.result && (
          <SentResultAlert
            title={`Sent "${send.result.template}"`}
            sentCount={send.result.sentCount}
            recipientIds={send.result.recipientIds}
            selectedCount={recipients.length}
          />
        )}
      </CardContent>
    </Card>
  );
}

function PreviewRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[75%] break-words text-right">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

// ─── Arbitrary push ───────────────────────────────────────────────────────────

/** Title + body inputs sharing the money-free copy rule. */
function PushCopyFields({
  idPrefix,
  title,
  body,
  onTitle,
  onBody,
  disabled,
}: {
  idPrefix: string;
  title: string;
  body: string;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  disabled?: boolean;
}) {
  const titleError = checkPushCopy(title, QA_PUSH_TITLE_MAX_CHARS);
  const bodyError = checkPushCopy(body, QA_PUSH_BODY_MAX_CHARS);

  return (
    <>
      <FormField
        label="Title"
        htmlFor={`${idPrefix}-title`}
        hint={
          titleError ? (
            <span className="text-destructive">{titleError}</span>
          ) : (
            `${title.trim().length}/${QA_PUSH_TITLE_MAX_CHARS}`
          )
        }
      >
        <Input
          id={`${idPrefix}-title`}
          value={title}
          disabled={disabled}
          onChange={(e) => onTitle(e.target.value)}
        />
      </FormField>
      <FormField
        label="Body"
        htmlFor={`${idPrefix}-body`}
        hint={
          bodyError ? (
            <span className="text-destructive">{bodyError}</span>
          ) : (
            `${body.trim().length}/${QA_PUSH_BODY_MAX_CHARS}`
          )
        }
      >
        <Textarea
          id={`${idPrefix}-body`}
          value={body}
          disabled={disabled}
          onChange={(e) => onBody(e.target.value)}
        />
      </FormField>
    </>
  );
}

function PushSection({ status }: { status: QaStatus }) {
  const [recipients, setRecipients] = useState<PickedUser[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const action = useQaAction<QaPushSendResponse>();

  const copyOk =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    !checkPushCopy(title, QA_PUSH_TITLE_MAX_CHARS) &&
    !checkPushCopy(body, QA_PUSH_BODY_MAX_CHARS);
  const ready = copyOk && recipients.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          Arbitrary push
        </CardTitle>
        <CardDescription>
          Free-text push to the users you pick. This copy renders on a locked phone, so the API
          rejects currency symbols, decimal amounts and @handles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UserPicker
          label="Recipients"
          selected={recipients}
          onChange={setRecipients}
          max={status.limits.maxSelectedUsers}
          allowAddAll
          disabled={action.busy}
        />

        <PushCopyFields
          idPrefix="qa-push"
          title={title}
          body={body}
          onTitle={setTitle}
          onBody={setBody}
          disabled={action.busy}
        />

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() =>
            void action.run(() =>
              qaApi.notifications.push({
                recipientUserIds: recipients.map((r) => r.id),
                title: title.trim(),
                body: body.trim(),
              }),
            )
          }
        >
          {action.busy && <BusySpinner />}
          Push to {recipients.length} recipient{recipients.length === 1 ? '' : 's'}
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SentResultAlert
            title="Pushed"
            sentCount={action.result.sentCount}
            recipientIds={action.result.recipientIds}
            selectedCount={recipients.length}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Broadcast (guarded) ──────────────────────────────────────────────────────

function BroadcastSection({ status }: { status: QaStatus }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const action = useQaAction<QaPushSendResponse>();

  const cap = status.limits.maxBroadcastRecipients;
  const phraseMatches = confirmation === QA_BROADCAST_CONFIRMATION;
  const copyOk =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    !checkPushCopy(title, QA_PUSH_TITLE_MAX_CHARS) &&
    !checkPushCopy(body, QA_PUSH_BODY_MAX_CHARS);

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Radio className="h-4 w-4" />
          Broadcast to ALL staging users
        </CardTitle>
        <CardDescription>
          A separate fan-out with its own body, so a targeted push can never widen into a broadcast
          by omitting a field. If the resolved audience exceeds {cap} users the API refuses with a
          409 — it never silently notifies the first {cap}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PushCopyFields
          idPrefix="qa-broadcast"
          title={title}
          body={body}
          onTitle={setTitle}
          onBody={setBody}
          disabled={action.busy}
        />

        <ConfirmPhraseInput
          id="qa-broadcast-confirm"
          phrase={QA_BROADCAST_CONFIRMATION}
          value={confirmation}
          onChange={setConfirmation}
          disabled={action.busy}
        />

        <Button
          type="button"
          variant="destructive"
          disabled={!phraseMatches || !copyOk || action.busy}
          onClick={() => {
            if (!window.confirm('Push this to EVERY user in the staging environment?')) return;
            void action.run(
              () =>
                qaApi.notifications.broadcast({
                  title: title.trim(),
                  body: body.trim(),
                  confirmation,
                }),
              (err, statusCode) =>
                statusCode === 409
                  ? `Broadcast refused — the resolved audience is over the ${cap}-user cap, and the API will not truncate it. (${err.message})`
                  : null,
            );
          }}
        >
          {action.busy && <BusySpinner />}
          Broadcast to everyone
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && (
          <SentResultAlert
            title="Broadcast"
            sentCount={action.result.sentCount}
            recipientIds={action.result.recipientIds}
          />
        )}
      </CardContent>
    </Card>
  );
}
