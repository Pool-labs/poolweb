'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ABSENT,
  ChipList,
  DetailCard,
  Field,
  TextBlock,
  Unreported,
  yesNo,
} from '@/components/admin/detail';
import { poolsApi } from '@/lib/admin/adminApi';
import { parseCityKey } from '@/lib/admin/cityKey';
import { formatDateTime, formatMoney, humanizeEnum } from '@/lib/admin/format';
import {
  hasRichPoolDetail,
  type AdminDepositEntry,
  type AdminLedgerSettlement,
  type AdminLedgerTransaction,
  type AdminPoolDetail,
  type AdminPoolLedgerSummary,
  type BalanceEntry,
} from '@/lib/admin/types';

/**
 * Pool detail (#83 management + #82 read-only ledger), regrouped into sections
 * by poolweb #31 over the poolmobile #618 contract: Identity · Location ·
 * About · Money · Members · Lifecycle, plus the ledger tabs unchanged.
 *
 * Renders against BOTH the narrow (pre-#618) and the widened payload — the
 * #112 switch can point this page at a production API that has not been
 * dispatched since June — and a section the API does not report says so in
 * one line (`Unreported`). The roster links every member through to the
 * (audited) user page; the pool read itself stays un-audited, which is why the
 * roster carries name/username/role/joinedAt and never a contact detail.
 */

export default function AdminPoolDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [pool, setPool] = useState<AdminPoolDetail | null>(null);
  const [ledger, setLedger] = useState<AdminPoolLedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, ledgerSummary] = await Promise.all([
        poolsApi.get(id),
        poolsApi.ledger(id).catch(() => null),
      ]);
      setPool(detail.pool);
      setLedger(ledgerSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pool');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/admin/pools">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to pools
        </Link>
      </Button>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error || !pool ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            {error ?? 'Pool not found'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{pool.name}</h1>
            <Badge variant="secondary">{humanizeEnum(pool.status)}</Badge>
            <Badge variant="outline">{humanizeEnum(pool.visibility)}</Badge>
            {pool.isSuspended && <Badge variant="destructive">Suspended</Badge>}
            {/* Staging-only (#566): rendered ONLY when present, so a production
                page carries no trace of it. */}
            {pool.seedCohort && <Badge variant="outline">Seed cohort: {pool.seedCohort}</Badge>}
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Balance" value={formatMoney(pool.balanceCents)} mono />
            <StatTile label="Members" value={String(pool.memberCount)} />
            <StatTile
              label="Total deposited"
              value={ledger ? formatMoney(ledger.totalDepositedCents) : ABSENT}
              mono
            />
            <StatTile
              label="Total spent"
              value={
                ledger
                  ? formatMoney(ledger.totalSpentCents)
                  : pool.totalSpentCents !== undefined
                    ? formatMoney(pool.totalSpentCents)
                    : ABSENT
              }
              mono
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <IdentitySection pool={pool} />
            <LocationSection pool={pool} />
            <AboutSection pool={pool} />
            <MoneySection pool={pool} ledger={ledger} />
            <LifecycleSection pool={pool} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {pool.isSuspended ? (
                  <Button disabled={busy} onClick={() => void runAction(() => poolsApi.restore(id))}>
                    Restore pool
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void runAction(() => poolsApi.suspend(id))}
                  >
                    Suspend pool
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <MembersSection pool={pool} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ledger (read-only)</CardTitle>
            </CardHeader>
            <CardContent>
              <LedgerTabs poolId={id} ledger={ledger} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Sections (#31 over the #618 contract) ───────────────────────────────────

function IdentitySection({ pool }: { pool: AdminPoolDetail }) {
  return (
    <DetailCard title="Identity">
      <Field label="Pool ID" value={pool.id} mono />
      <Field label="Name" value={pool.name} />
      <Field label="Status" value={humanizeEnum(pool.status)} />
      <Field label="Visibility" value={humanizeEnum(pool.visibility)} />
      <Field label="Suspended" value={pool.isSuspended ? 'Yes' : 'No'} />
      {pool.deletedAt && <Field label="Suspended at" value={formatDateTime(pool.deletedAt)} />}
      <Field label="Creator">
        <Link href={`/admin/users/${pool.creator.id}`} className="underline">
          {pool.creator.displayName ?? pool.creator.email ?? pool.creator.id}
        </Link>
      </Field>
      {pool.seedCohort && <Field label="Seed cohort" value={pool.seedCohort} />}
    </DetailCard>
  );
}

function LocationSection({ pool }: { pool: AdminPoolDetail }) {
  const rich = hasRichPoolDetail(pool);
  const key = parseCityKey(pool.locationCityKey);
  return (
    <DetailCard
      title="Location"
      description="City-level from the canonical key (#128/#469); the exact venue only if the owner opted in (#21)."
    >
      {!rich ? (
        <Unreported what="Location fields" />
      ) : (
        <>
          <Field label="City" value={pool.locationCity} />
          <Field label="Region" value={key?.regionCode} />
          <Field label="Country" value={key ? (key.countryName ?? ABSENT) : null} />
          <Field label="City key" value={pool.locationCityKey} mono />
          <Field label="Exact venue shown" value={yesNo(pool.showExactVenue)} />
          <Field label="Venue address" value={pool.venueAddress} />
          <Field
            label="Coordinates"
            mono
            value={
              pool.locationLat === null ||
              pool.locationLat === undefined ||
              pool.locationLng === null ||
              pool.locationLng === undefined
                ? null
                : `${pool.locationLat.toFixed(5)}, ${pool.locationLng.toFixed(5)}`
            }
          />
        </>
      )}
    </DetailCard>
  );
}

function AboutSection({ pool }: { pool: AdminPoolDetail }) {
  const rich = hasRichPoolDetail(pool);
  return (
    <DetailCard title="About" description="What the pool is for (#236), its tags and house rules (#401).">
      {!rich ? (
        <Unreported what="About fields" />
      ) : (
        <>
          <Field label="Category" value={pool.category} />
          <Field label="Subcategory" value={pool.subcategory} />
          <ChipList label="Tags" items={pool.tags} labelFn={humanizeEnum} />
          <ChipList label="Custom tags" items={pool.customTags} />
          <TextBlock label="Short description" value={pool.shortDescription} />
          <TextBlock label="House rules (advisory — Pool does not check these)" value={pool.rules} />
          <Field label="Hidden from global leaderboards" value={yesNo(pool.hideFromGlobalLeaderboards)} />
        </>
      )}
    </DetailCard>
  );
}

function MoneySection({ pool, ledger }: { pool: AdminPoolDetail; ledger: AdminPoolLedgerSummary | null }) {
  const rich = hasRichPoolDetail(pool);
  return (
    <DetailCard title="Money" description="Integer cents from the pool row; the ledger tabs below are the row-level record.">
      <Field label="Balance" value={formatMoney(pool.balanceCents)} mono />
      {!rich ? (
        <Unreported what="Contribution, spend and member-limit fields" />
      ) : (
        <>
          <Field
            label="Contribution amount"
            mono
            value={
              pool.contributionAmountCents === undefined ? null : formatMoney(pool.contributionAmountCents)
            }
          />
          <Field
            label="Total spent"
            mono
            value={pool.totalSpentCents === undefined ? null : formatMoney(pool.totalSpentCents)}
          />
          <Field label="Expenses logged" value={pool.totalExpenses} />
          <Field
            label="Net admin adjustments"
            mono
            value={
              pool.netAdjustmentsCents === undefined || pool.netAdjustmentsCents === null
                ? ledger
                  ? formatMoney(ledger.netAdjustmentsCents ?? 0)
                  : null
                : formatMoney(pool.netAdjustmentsCents)
            }
          />
          <Field
            label="Member limit"
            value={
              pool.memberLimit === undefined && pool.memberLimitMin === undefined
                ? null
                : `${pool.memberLimitMin ?? ABSENT} – ${pool.memberLimit ?? ABSENT}`
            }
          />
        </>
      )}
    </DetailCard>
  );
}

function LifecycleSection({ pool }: { pool: AdminPoolDetail }) {
  return (
    <DetailCard title="Lifecycle">
      <Field label="Created" value={formatDateTime(pool.createdAt)} />
      <Field label="Updated" value={formatDateTime(pool.updatedAt)} />
      <Field
        label="Last activity"
        value={hasRichPoolDetail(pool) ? formatDateTime(pool.lastActivityAt) : null}
      />
      {pool.deletedAt && <Field label="Suspended at" value={formatDateTime(pool.deletedAt)} />}
    </DetailCard>
  );
}

function MembersSection({ pool }: { pool: AdminPoolDetail }) {
  const members = pool.members;
  return (
    <DetailCard
      title={`Members (${pool.memberCount})`}
      description="Active roster. Each row opens the user's (audited) detail page; contact details never travel on this payload."
    >
      {members === undefined ? (
        <Unreported what="The roster rows" />
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active members.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <Link href={`/admin/users/${m.userId}`} className="font-medium underline">
                      {m.displayName ?? m.username ?? m.userId}
                    </Link>
                    {m.userId === pool.creator.id && (
                      <Badge variant="outline" className="ml-2">
                        Creator
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.username ? `@${m.username}` : ABSENT}
                  </TableCell>
                  <TableCell>{humanizeEnum(m.role)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(m.joinedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DetailCard>
  );
}

function LedgerTabs({
  poolId,
  ledger,
}: {
  poolId: string;
  ledger: AdminPoolLedgerSummary | null;
}) {
  return (
    <Tabs defaultValue="balances">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="balances">
          Balances{ledger ? ` (${ledger.memberBalances.length})` : ''}
        </TabsTrigger>
        <TabsTrigger value="deposits">
          Deposits{ledger ? ` (${ledger.counts.deposits})` : ''}
        </TabsTrigger>
        <TabsTrigger value="transactions">
          Transactions{ledger ? ` (${ledger.counts.transactions})` : ''}
        </TabsTrigger>
        <TabsTrigger value="settlements">
          Settlements{ledger ? ` (${ledger.counts.settlements})` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="balances">
        <BalancesTable balances={ledger?.memberBalances ?? []} />
      </TabsContent>
      <TabsContent value="deposits">
        <DepositsTable poolId={poolId} />
      </TabsContent>
      <TabsContent value="transactions">
        <TransactionsTable poolId={poolId} />
      </TabsContent>
      <TabsContent value="settlements">
        <SettlementsTable poolId={poolId} />
      </TabsContent>
    </Tabs>
  );
}

function BalancesTable({ balances }: { balances: BalanceEntry[] }) {
  if (balances.length === 0) return <Empty>No outstanding balances</Empty>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From (owes)</TableHead>
            <TableHead>To (owed)</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {balances.map((b, i) => (
            <TableRow key={`${b.fromUserId}-${b.toUserId}-${i}`}>
              <TableCell className="font-mono text-xs">{b.fromUserId}</TableCell>
              <TableCell className="font-mono text-xs">{b.toUserId}</TableCell>
              <TableCell className="text-right font-mono">{formatMoney(b.amountCents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Generic cursor-paginated ledger list loader. */
function useLedgerList<T>(
  loader: (cursor?: string) => Promise<{ rows: T[]; nextCursor: string | null }>,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchPage = useCallback(
    async (nextCursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await loader(nextCursor);
        setRows((prev) => (nextCursor ? [...prev, ...res.rows] : res.rows));
        setCursor(res.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [loader],
  );

  useEffect(() => {
    void fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, cursor, loading, error, loaded, loadMore: () => fetchPage(cursor ?? undefined) };
}

function DepositsTable({ poolId }: { poolId: string }) {
  const { rows, cursor, loading, error, loaded, loadMore } = useLedgerList<AdminDepositEntry>(
    useCallback(
      async (cursor) => {
        const res = await poolsApi.ledgerDeposits(poolId, cursor);
        return { rows: res.deposits, nextCursor: res.nextCursor };
      },
      [poolId],
    ),
  );

  if (loading && !loaded) return <LoadingRow />;
  if (error) return <ErrorRow message={error} />;
  if (rows.length === 0) return <Empty>No deposits</Empty>;

  return (
    <ListShell cursor={cursor} loading={loading} onLoadMore={loadMore}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-mono text-xs">{d.userId}</TableCell>
              <TableCell>{humanizeEnum(d.status)}</TableCell>
              <TableCell className="text-right font-mono">{formatMoney(d.amountCents)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(d.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListShell>
  );
}

function TransactionsTable({ poolId }: { poolId: string }) {
  const { rows, cursor, loading, error, loaded, loadMore } = useLedgerList<AdminLedgerTransaction>(
    useCallback(
      async (cursor) => {
        const res = await poolsApi.ledgerTransactions(poolId, cursor);
        return { rows: res.transactions, nextCursor: res.nextCursor };
      },
      [poolId],
    ),
  );

  if (loading && !loaded) return <LoadingRow />;
  if (error) return <ErrorRow message={error} />;
  if (rows.length === 0) return <Empty>No transactions</Empty>;

  return (
    <ListShell cursor={cursor} loading={loading} onLoadMore={loadMore}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merchant</TableHead>
            <TableHead>Spender</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.merchantName ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs">
                {t.user?.displayName ?? t.userId}
              </TableCell>
              <TableCell>{humanizeEnum(t.status)}</TableCell>
              <TableCell className="text-right font-mono">{formatMoney(t.amountCents)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListShell>
  );
}

function SettlementsTable({ poolId }: { poolId: string }) {
  const { rows, cursor, loading, error, loaded, loadMore } = useLedgerList<AdminLedgerSettlement>(
    useCallback(
      async (cursor) => {
        const res = await poolsApi.ledgerSettlements(poolId, cursor);
        return { rows: res.settlements, nextCursor: res.nextCursor };
      },
      [poolId],
    ),
  );

  if (loading && !loaded) return <LoadingRow />;
  if (error) return <ErrorRow message={error} />;
  if (rows.length === 0) return <Empty>No settlements</Empty>;

  return (
    <ListShell cursor={cursor} loading={loading} onLoadMore={loadMore}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.fromUserId}</TableCell>
              <TableCell className="font-mono text-xs">{s.toUserId}</TableCell>
              <TableCell>{humanizeEnum(s.method)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    s.status === 'CONFIRMED'
                      ? 'default'
                      : s.status === 'REJECTED'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {humanizeEnum(s.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">{formatMoney(s.amountCents)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(s.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListShell>
  );
}

function ListShell({
  children,
  cursor,
  loading,
  onLoadMore,
}: {
  children: React.ReactNode;
  cursor: string | null;
  loading: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">{children}</div>
      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" disabled={loading} onClick={onLoadMore}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className={mono ? 'font-mono text-xl font-bold' : 'text-2xl font-bold'}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{children}</div>;
}

function LoadingRow() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return <div className="py-8 text-center text-sm text-destructive">{message}</div>;
}
