'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CityFilter } from '@/components/admin/CityFilter';
import { CreatePoolDialog } from '@/components/admin/CreatePoolDialog';
import { poolsApi } from '@/lib/admin/adminApi';
import type { ApiEnv } from '@/lib/admin/adminEnv';
import { formatDate, formatMoney, humanizeEnum } from '@/lib/admin/format';
import { PoolStatus, PoolVisibility, type AdminPoolSummary } from '@/lib/admin/types';

const PAGE_SIZE = 25;
const ANY = 'any';

/**
 * Suspense for `useSearchParams` — see the note on the Users list, including
 * why `env` is a prop rather than a cookie read.
 */
export function PoolsScreen({ env }: { env: ApiEnv }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <PoolsList env={env} />
    </Suspense>
  );
}

function PoolsList({ env }: { env: ApiEnv }) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [status, setStatus] = useState<string>(ANY);
  const [visibility, setVisibility] = useState<string>(ANY);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  /** The server's own opaque city key, passed through unchanged (#128/#469). */
  const [city, setCity] = useState<string | null>(() => searchParams.get('city'));
  const [offset, setOffset] = useState(0);
  const [pools, setPools] = useState<AdminPoolSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await poolsApi.list({
        q: submittedQ || undefined,
        status: status === ANY ? undefined : (status as PoolStatus),
        visibility: visibility === ANY ? undefined : (visibility as PoolVisibility),
        city: city ?? undefined,
        includeDeleted,
        limit: PAGE_SIZE,
        offset,
      });
      setPools(res.pools);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pools');
    } finally {
      setLoading(false);
    }
  }, [submittedQ, status, visibility, city, includeDeleted, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setSubmittedQ(q.trim());
  };

  const resetPage = () => setOffset(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Pools</h1>
        <CreatePoolDialog env={env} onCreated={() => void load()} />
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form onSubmit={onSearch} className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by pool name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </form>
        <Select
          value={status}
          onValueChange={(v) => {
            resetPage();
            setStatus(v);
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            {Object.values(PoolStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {humanizeEnum(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={visibility}
          onValueChange={(v) => {
            resetPage();
            setVisibility(v);
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any visibility</SelectItem>
            {Object.values(PoolVisibility).map((v) => (
              <SelectItem key={v} value={v}>
                {humanizeEnum(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={includeDeleted ? 'all' : 'active'}
          onValueChange={(v) => {
            resetPage();
            setIncludeDeleted(v === 'all');
          }}
        >
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="all">Include suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CityFilter
        value={city}
        onChange={(key) => {
          resetPage();
          setCity(key);
        }}
        className="lg:max-w-sm"
      />

      <Card>
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-destructive">{error}</div>
          ) : pools.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {city ? 'No pools in this city' : 'No pools found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/*
                      ⚠️ Eight columns do not fit a phone. Visibility, Members
                      and Created are hidden below `sm`/`md`; Name, Status,
                      City, Balance and the ACTION always render — a row you can
                      read but not open is the failure this avoids. Balance
                      stays because it is the figure somebody opens this list to
                      scan.
                    */}
                    <TableHead className="px-2 sm:px-4">Name</TableHead>
                    <TableHead className="px-2 sm:px-4">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Visibility</TableHead>
                    <TableHead className="px-2 sm:px-4">City</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Members</TableHead>
                    <TableHead className="px-2 text-right sm:px-4">Balance</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="px-2 text-right sm:px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pools.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="px-2 font-medium sm:px-4">
                        {p.name}
                        {p.isSuspended && (
                          <Badge variant="destructive" className="ml-2">
                            Suspended
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">{humanizeEnum(p.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {humanizeEnum(p.visibility)}
                      </TableCell>
                      {/* City-level; `title` carries the canonical key the filter matches on. */}
                      <TableCell
                        className="px-2 text-muted-foreground sm:px-4"
                        title={p.locationCityKey ?? undefined}
                      >
                        {p.locationCity ?? '—'}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        {p.memberCount}
                      </TableCell>
                      <TableCell className="px-2 text-right font-mono sm:px-4">
                        {formatMoney(p.balanceCents)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {formatDate(p.createdAt)}
                      </TableCell>
                      <TableCell className="px-2 text-right sm:px-4">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/pools/${p.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}${city ? ' in this city' : ''}`
            : city
              ? '0 pools in this city'
              : '0 pools'}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
