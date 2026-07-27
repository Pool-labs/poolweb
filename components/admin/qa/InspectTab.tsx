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
import { formatDateTime, formatMoney, humanizeEnum } from '@/lib/admin/format';
import type {
  QaMembershipSummary,
  QaPushTokenSummary,
  QaRecentNotification,
  QaUserBalances,
  QaUserInspection,
} from '@/lib/admin/types';
import { UserPicker, type PickedUser } from './UserPicker';
import { ErrorAlert } from './primitives';

/**
 * Inspect tab: a user's full derived state on one screen — so "why didn't they
 * get the push?" is answerable without a psql session.
 *
 * Read-only. The balances block mirrors `MyBalancesSummary` verbatim: the same
 * server-authoritative integer cents the member sees, formatted through
 * `formatMoney` and never recomputed here.
 *
 * PRIVACY: push tokens arrive already masked from the API (a short trailing
 * suffix) and are rendered only through that masked field.
 */

export function InspectTab() {
  const [selected, setSelected] = useState<PickedUser[]>([]);
  const [data, setData] = useState<QaUserInspection | null>(null);
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
            Server-side view of one account: profile, pools, balances, notification preferences,
            registered devices and recent notifications.
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
              <dl className="space-y-1.5 text-sm">
                <Row label="User id" value={data.userId} mono />
                <Row label="Email" value={data.email ?? '—'} />
                <Row label="Display name" value={data.displayName ?? '—'} />
                <Row label="Username" value={data.username ?? '—'} />
                <Row label="Discoverable" value={data.isDiscoverable ? 'Yes' : 'No'} />
                <Row
                  label="Deleted at"
                  value={data.deletedAt ? formatDateTime(data.deletedAt) : '—'}
                />
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.isPlatformAdmin && <Badge>Platform admin</Badge>}
                {data.deletedAt && <Badge variant="destructive">Suspended / deleted</Badge>}
              </div>
            </Section>

            <Section title="Feature flags">
              {Object.keys(data.featureFlags ?? {}).length === 0 ? (
                <Empty label="No flags set" />
              ) : (
                <dl className="space-y-1.5 text-sm">
                  {Object.entries(data.featureFlags).map(([key, value]) => (
                    <Row key={key} label={key} value={value ? 'Enabled' : 'Disabled'} />
                  ))}
                </dl>
              )}
            </Section>
          </div>

          <Section
            title="Balances"
            description="The same server-authoritative figures the member sees — integer cents, never recomputed here."
          >
            <BalancesBlock balances={data.balances} />
          </Section>

          <Section title={`Memberships (${data.memberships?.length ?? 0})`}>
            {data.memberships && data.memberships.length > 0 ? (
              <MembershipTable memberships={data.memberships} />
            ) : (
              <Empty label="Not a member of any pool" />
            )}
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Notification preferences"
              description="The first thing to check when an expected push never arrives."
            >
              <dl className="space-y-1.5 text-sm">
                <Row
                  label="Push enabled (master switch)"
                  value={data.notificationPreferences?.pushEnabled ? 'Yes' : 'No — nothing pushes'}
                />
                <Row
                  label="Discovery nudges"
                  value={data.notificationPreferences?.discoveryNudgesEnabled ? 'Opted in' : 'Off'}
                />
              </dl>
              <div className="mt-2">
                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Opted-out categories
                </div>
                {(data.notificationPreferences?.disabledCategories ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {data.notificationPreferences.disabledCategories.map((c) => (
                      <Badge key={c} variant="secondary">
                        {humanizeEnum(c)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <Section
              title={`Push tokens (${data.pushTokens?.length ?? 0})`}
              description="Masked by the API — the full token is never sent to this page."
            >
              {data.pushTokens && data.pushTokens.length > 0 ? (
                <PushTokenTable tokens={data.pushTokens} />
              ) : (
                <Empty label="No registered devices — pushes cannot be delivered" />
              )}
            </Section>
          </div>

          <Section title={`Recent notifications (${data.recentNotifications?.length ?? 0})`}>
            {data.recentNotifications && data.recentNotifications.length > 0 ? (
              <NotificationTable notifications={data.recentNotifications} />
            ) : (
              <Empty label="No notifications yet" />
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

function BalancesBlock({ balances }: { balances: QaUserBalances }) {
  if (!balances) return <Empty label="No balance data" />;
  const perPool = balances.perPool ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Owed to them" value={formatMoney(balances.totalOwedToYouCents)} />
        <Stat label="They owe" value={formatMoney(balances.totalYouOweCents)} />
        <Stat label="Net" value={formatMoney(balances.netCents)} />
      </div>
      {perPool.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perPool.map((p) => (
                <TableRow key={p.poolId}>
                  <TableCell className="text-sm">{p.poolName}</TableCell>
                  <TableCell className="text-right text-sm">{formatMoney(p.netCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function MembershipTable({ memberships }: { memberships: QaMembershipSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pool id</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((m) => (
            <TableRow key={m.poolId}>
              <TableCell className="text-sm">{m.poolName}</TableCell>
              <TableCell className="text-sm">{humanizeEnum(m.role)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {humanizeEnum(m.status)}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{m.poolId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
            <TableHead>Token</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-sm">
                {t.deviceName ?? '—'}
                {t.appVersion && (
                  <span className="ml-1 text-xs text-muted-foreground">v{t.appVersion}</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.platform}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                …{t.maskedToken}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDateTime(t.lastUsedAt)}
              </TableCell>
              <TableCell>
                {t.disabledAt ? (
                  <Badge variant="destructive">Revoked</Badge>
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

function NotificationTable({ notifications }: { notifications: QaRecentNotification[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Read</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((n) => (
            <TableRow key={n.id}>
              <TableCell className="text-sm">{n.title}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{n.type}</TableCell>
              <TableCell>
                {n.isRead ? (
                  <Badge variant="secondary">Read</Badge>
                ) : (
                  <Badge variant="default">Unread</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDateTime(n.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'break-all font-mono text-xs' : 'break-words text-right'}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}
