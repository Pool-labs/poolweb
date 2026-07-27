'use client';

import { useState } from 'react';
import { Megaphone, Radio, Send } from 'lucide-react';

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
import {
  QA_BROADCAST_CAP,
  QA_BROADCAST_CONFIRMATION,
  QA_MAX_RECIPIENTS,
  QaNotificationChannel,
  type QaFanoutResult,
  type QaNotificationPreview,
  type QaStatus,
} from '@/lib/admin/types';
import { UserPicker, type PickedUser } from './UserPicker';
import {
  BusySpinner,
  ConfirmPhraseInput,
  ErrorAlert,
  FanoutResultAlert,
  FormField,
  KeyValueRows,
  SuccessAlert,
  useQaAction,
} from './primitives';

/**
 * Notifications tab: fire any templated notification at chosen recipients,
 * preview the exact copy first, send arbitrary custom copy, and (loudly
 * separated) broadcast to every staging user behind a typed confirmation.
 */

const CHANNEL_LABELS: Record<QaNotificationChannel, string> = {
  [QaNotificationChannel.Push]: 'Push only',
  [QaNotificationChannel.InApp]: 'In-app only',
  [QaNotificationChannel.Both]: 'Push + in-app',
};

/** Optional JSON context blob for templated notifications. */
function useJsonContext() {
  const [raw, setRaw] = useState('');
  const trimmed = raw.trim();
  let parsed: Record<string, unknown> | undefined;
  let error: string | null = null;
  if (trimmed.length > 0) {
    try {
      const value: unknown = JSON.parse(trimmed);
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        error = 'Context must be a JSON object';
      } else {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      error = 'Invalid JSON';
    }
  }
  return { raw, setRaw, parsed, error };
}

export function NotificationsTab({ status }: { status: QaStatus }) {
  const types = status.notificationTypes ?? [];

  return (
    <div className="space-y-6">
      <TemplatedSection types={types} />
      <CustomSection />
      <BroadcastSection types={types} />
    </div>
  );
}

// ─── Templated: preview → send ────────────────────────────────────────────────

function TemplatedSection({ types }: { types: string[] }) {
  const [type, setType] = useState(types[0] ?? '');
  const [recipients, setRecipients] = useState<PickedUser[]>([]);
  const context = useJsonContext();
  const preview = useQaAction<QaNotificationPreview>();
  const send = useQaAction<QaFanoutResult>();

  const previewTarget = recipients[0] ?? null;
  const ready = type.trim().length > 0 && !context.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4" />
          Templated notification
        </CardTitle>
        <CardDescription>
          Render a real notification type against real recipients. Preview shows the exact copy the
          device will get — including whether a push will actually fire.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          label="Notification type"
          htmlFor="qa-notif-type"
          hint={
            types.length === 0
              ? 'The API reported no notification types; enter one manually.'
              : undefined
          }
        >
          {types.length === 0 ? (
            <Input
              id="qa-notif-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. POOL_INVITE"
            />
          ) : (
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="qa-notif-type">
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <UserPicker
          label="Recipients"
          selected={recipients}
          onChange={setRecipients}
          max={QA_MAX_RECIPIENTS}
          allowAddAll
          hint={
            previewTarget
              ? `Preview renders for the first selected recipient (${previewTarget.name}).`
              : 'Pick at least one recipient — preview uses the first one.'
          }
        />

        <FormField
          label="Context (optional JSON)"
          htmlFor="qa-notif-context"
          hint={
            context.error ? (
              <span className="text-destructive">{context.error}</span>
            ) : (
              'Template variables, e.g. {"poolName":"Ski Trip"}. Left empty when not needed.'
            )
          }
        >
          <Textarea
            id="qa-notif-context"
            value={context.raw}
            onChange={(e) => context.setRaw(e.target.value)}
            placeholder='{"poolName":"Ski Trip"}'
            className="font-mono text-xs"
          />
        </FormField>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!ready || !previewTarget || preview.busy}
            onClick={() => {
              if (!previewTarget) return;
              void preview.run(() =>
                qaApi.notifications.preview({
                  type,
                  userId: previewTarget.id,
                  context: context.parsed,
                }),
              );
            }}
          >
            {preview.busy && <BusySpinner />}
            Preview
          </Button>
          <Button
            type="button"
            disabled={!ready || recipients.length === 0 || send.busy}
            onClick={() =>
              void send.run(() =>
                qaApi.notifications.send({
                  type,
                  userIds: recipients.map((r) => r.id),
                  context: context.parsed,
                }),
              )
            }
          >
            {send.busy && <BusySpinner />}
            Send to {recipients.length} recipient{recipients.length === 1 ? '' : 's'}
          </Button>
        </div>

        <ErrorAlert message={preview.error} />
        {preview.result && (
          <SuccessAlert title="Preview">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={preview.result.willPush ? 'default' : 'secondary'}>
                  {preview.result.willPush ? 'Will push' : 'No push (in-app only)'}
                </Badge>
              </div>
              <KeyValueRows
                data={{
                  title: preview.result.title,
                  body: preview.result.body,
                  pushTitle: preview.result.pushTitle,
                  pushBody: preview.result.pushBody,
                }}
              />
            </div>
          </SuccessAlert>
        )}

        <ErrorAlert message={send.error} />
        {send.result && <FanoutResultAlert result={send.result} />}
      </CardContent>
    </Card>
  );
}

// ─── Custom free-text ─────────────────────────────────────────────────────────

function CustomSection() {
  const [recipients, setRecipients] = useState<PickedUser[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [channel, setChannel] = useState<QaNotificationChannel>(QaNotificationChannel.Both);
  const action = useQaAction<QaFanoutResult>();

  const ready = title.trim().length > 0 && body.trim().length > 0 && recipients.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          Custom notification
        </CardTitle>
        <CardDescription>
          Free-text copy, no template. Push title/body fall back to the in-app copy when left blank.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UserPicker
          label="Recipients"
          selected={recipients}
          onChange={setRecipients}
          max={QA_MAX_RECIPIENTS}
          allowAddAll
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" htmlFor="qa-custom-title">
            <Input id="qa-custom-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Push title (optional)" htmlFor="qa-custom-push-title">
            <Input
              id="qa-custom-push-title"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Body" htmlFor="qa-custom-body">
          <Textarea id="qa-custom-body" value={body} onChange={(e) => setBody(e.target.value)} />
        </FormField>

        <FormField label="Push body (optional)" htmlFor="qa-custom-push-body">
          <Textarea
            id="qa-custom-push-body"
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
          />
        </FormField>

        <FormField label="Channel" htmlFor="qa-custom-channel">
          <Select value={channel} onValueChange={(v) => setChannel(v as QaNotificationChannel)}>
            <SelectTrigger id="qa-custom-channel" className="sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(QaNotificationChannel).map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <Button
          type="button"
          disabled={!ready || action.busy}
          onClick={() =>
            void action.run(() =>
              qaApi.notifications.custom({
                userIds: recipients.map((r) => r.id),
                title: title.trim(),
                body: body.trim(),
                pushTitle: pushTitle.trim() || undefined,
                pushBody: pushBody.trim() || undefined,
                channel,
              }),
            )
          }
        >
          {action.busy && <BusySpinner />}
          Send custom notification
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <FanoutResultAlert result={action.result} />}
      </CardContent>
    </Card>
  );
}

// ─── Broadcast (guarded) ──────────────────────────────────────────────────────

function BroadcastSection({ types }: { types: string[] }) {
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [type, setType] = useState(types[0] ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<QaNotificationChannel>(QaNotificationChannel.Both);
  const [confirmation, setConfirmation] = useState('');
  const action = useQaAction<QaFanoutResult>();

  const phraseMatches = confirmation === QA_BROADCAST_CONFIRMATION;
  const copyReady =
    mode === 'template' ? type.trim().length > 0 : title.trim().length > 0 && body.trim().length > 0;

  const submit = () =>
    void action.run(
      () =>
        qaApi.notifications.broadcast(
          mode === 'template'
            ? { type: type.trim(), confirmation }
            : { title: title.trim(), body: body.trim(), channel, confirmation },
        ),
      (err, statusCode) =>
        statusCode === 409
          ? `Broadcast refused — the audience is over the ${QA_BROADCAST_CAP}-user cap. (${err.message})`
          : null,
    );

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Radio className="h-4 w-4" />
          Broadcast to ALL staging users
        </CardTitle>
        <CardDescription>
          Fans out to every user in the staging environment. The API refuses with a 409 if the
          audience exceeds {QA_BROADCAST_CAP} users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Copy source" htmlFor="qa-broadcast-mode">
          <Select value={mode} onValueChange={(v) => setMode(v as 'template' | 'custom')}>
            <SelectTrigger id="qa-broadcast-mode" className="sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="template">Templated type</SelectItem>
              <SelectItem value="custom">Custom copy</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {mode === 'template' ? (
          <FormField label="Notification type" htmlFor="qa-broadcast-type">
            {types.length === 0 ? (
              <Input
                id="qa-broadcast-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. ANNOUNCEMENT"
              />
            ) : (
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="qa-broadcast-type">
                  <SelectValue placeholder="Choose a type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        ) : (
          <>
            <FormField label="Title" htmlFor="qa-broadcast-title">
              <Input
                id="qa-broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>
            <FormField label="Body" htmlFor="qa-broadcast-body">
              <Textarea
                id="qa-broadcast-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </FormField>
            <FormField label="Channel" htmlFor="qa-broadcast-channel">
              <Select value={channel} onValueChange={(v) => setChannel(v as QaNotificationChannel)}>
                <SelectTrigger id="qa-broadcast-channel" className="sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(QaNotificationChannel).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </>
        )}

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
          disabled={!phraseMatches || !copyReady || action.busy}
          onClick={() => {
            if (!window.confirm('Send this notification to EVERY staging user?')) return;
            submit();
          }}
        >
          {action.busy && <BusySpinner />}
          Broadcast to everyone
        </Button>

        <ErrorAlert message={action.error} />
        {action.result && <FanoutResultAlert result={action.result} />}
      </CardContent>
    </Card>
  );
}
