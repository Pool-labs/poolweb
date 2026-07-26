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
import { poolsApi } from '@/lib/admin/adminApi';
import { formatDateTime, formatMoney, humanizeEnum } from '@/lib/admin/format';
import type {
  AdminDepositEntry,
  AdminLedgerSettlement,
  AdminLedgerTransaction,
  AdminPoolDetail,
  AdminPoolLedgerSummary,
  BalanceEntry,
} from '@/lib/admin/types';

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
              value={ledger ? formatMoney(ledger.totalDepositedCents) : '—'}
              mono
            />
            <StatTile
              label="Total spent"
              value={ledger ? formatMoney(ledger.totalSpentCents) : '—'}
              mono
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="Pool ID" value={pool.id} mono />
                <Field label="Creator" value={pool.creator.displayName ?? pool.creator.email ?? pool.creator.id} />
                <Field label="Created" value={formatDateTime(pool.createdAt)} />
                <Field label="Updated" value={formatDateTime(pool.updatedAt)} />
                {pool.deletedAt && <Field label="Suspended at" value={formatDateTime(pool.deletedAt)} />}
              </CardContent>
            </Card>

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

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs' : 'text-right'}>{value}</span>
    </div>
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
