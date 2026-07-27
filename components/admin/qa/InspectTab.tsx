'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { qaApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import type { QaInspectResponse, QaPushTokenSummary } from '@/lib/admin/types';
import { UserPicker, type PickedUser } from './UserPicker';
import { ErrorAlert, JsonBlock, KeyValueRows, RawSection, isRecord } from './primitives';

/**
 * Inspect tab: everything the server knows about one user, on one screen —
 * so "why didn't they get the push?" is answerable without a psql session.
 *
 * The payload is rendered defensively (see `KeyValueRows` / `RawSection`): the
 * #132 contract pins down only the push-token shape, so unknown or renamed
 * sections degrade to a readable dump instead of a blank card.
 *
 * PRIVACY: push tokens arrive already masked from the API and are rendered ONLY
 * through the masked field — no raw-JSON escape hatch exists for that section.
 */

export function InspectTab() {
  const [selected, setSelected] = useState<PickedUser[]>([]);
  const [data, setData] = useState<QaInspectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = selected[0]?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await qaApi.inspect.user(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to inspect user');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspect a user</CardTitle>
          <CardDescription>
            Server-side view of one account: profile, pools, balances, engagement, notification
            preferences and registered devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserPicker label="User" selected={selected} onChange={setSelected} max={1} />
        </CardContent>
      </Card>

      <ErrorAlert message={error} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !userId ? (
        <div className="py-12 text-center text-muted-foreground">
          Pick a user to inspect their state
        </div>
      ) : !data ? null : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Profile">
              {isRecord(data.user) ? (
                <KeyValueRows data={data.user} />
              ) : (
                <Empty label="No profile returned" />
              )}
            </Section>

            <Section title="Engagement">
              <KeyValueRows
                data={{
                  pointBalance: data.pointBalance ?? null,
                }}
              />
              {isRecord(data.streak) ? (
                <div className="mt-2">
                  <KeyValueRows data={data.streak} />
                </div>
              ) : data.streak !== undefined && data.streak !== null ? (
                <div className="mt-2">
                  <JsonBlock value={data.streak} />
                </div>
              ) : null}
            </Section>
          </div>

          <Section title="Balances">
            {isRecord(data.balances) ? (
              <KeyValueRows data={data.balances} />
            ) : Array.isArray(data.balances) ? (
              <RecordList rows={data.balances} />
            ) : data.balances !== undefined && data.balances !== null ? (
              <JsonBlock value={data.balances} />
            ) : (
              <Empty label="No balance data" />
            )}
          </Section>

          <Section title={`Memberships (${data.memberships?.length ?? 0})`}>
            {data.memberships && data.memberships.length > 0 ? (
              <RecordList rows={data.memberships} />
            ) : (
              <Empty label="Not a member of any pool" />
            )}
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Feature flags">
              {isRecord(data.featureFlags) ? (
                <KeyValueRows data={data.featureFlags} />
              ) : (
                <Empty label="No flags returned" />
              )}
            </Section>

            <Section title="Notification preferences">
              {isRecord(data.notificationPreferences) ? (
                <KeyValueRows data={data.notificationPreferences} />
              ) : (
                <Empty label="No preferences returned" />
              )}
            </Section>
          </div>

          <Section
            title={`Push tokens (${data.pushTokens?.length ?? 0})`}
            description="Tokens are masked by the API — the full value is never sent to this page."
          >
            {data.pushTokens && data.pushTokens.length > 0 ? (
              <PushTokenTable tokens={data.pushTokens} />
            ) : (
              <Empty label="No registered devices — pushes cannot be delivered" />
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

/** A list of arbitrary records: one key/value block each, plus a raw fallback. */
function RecordList({ rows }: { rows: unknown[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border p-3">
          {isRecord(row) ? <KeyValueRows data={row} /> : <JsonBlock value={row} />}
        </div>
      ))}
      <RawSection label="Raw payload" value={rows} />
    </div>
  );
}

function PushTokenTable({ tokens }: { tokens: QaPushTokenSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Token (masked)</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-sm">{t.deviceName ?? '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.platform}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {t.maskedToken}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDateTime(t.lastUsedAt)}
              </TableCell>
              <TableCell>
                {t.disabledAt ? (
                  <Badge variant="destructive">Disabled</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
