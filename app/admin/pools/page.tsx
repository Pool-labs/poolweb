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
import { poolsApi } from '@/lib/admin/adminApi';
import { formatDate, formatMoney, humanizeEnum } from '@/lib/admin/format';
import { PoolStatus, PoolVisibility, type AdminPoolSummary } from '@/lib/admin/types';

const PAGE_SIZE = 25;
const ANY = 'any';

/** Suspense for `useSearchParams` — see the note on the Users list. */
export default function AdminPoolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <PoolsList />
    </Suspense>
  );
}

function PoolsList() {
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
      <h1 className="text-2xl font-bold">Pools</h1>

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
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pools.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.name}
                        {p.isSuspended && (
                          <Badge variant="destructive" className="ml-2">
                            Suspended
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{humanizeEnum(p.status)}</TableCell>
                      <TableCell>{humanizeEnum(p.visibility)}</TableCell>
                      {/* City-level; `title` carries the canonical key the filter matches on. */}
                      <TableCell className="text-muted-foreground" title={p.locationCityKey ?? undefined}>
                        {p.locationCity ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">{p.memberCount}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(p.balanceCents)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                      <TableCell className="text-right">
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
