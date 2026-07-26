'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usersApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import { UserFeatureFlagKey, type AdminUserDetail } from '@/lib/admin/types';

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.get(id);
      setUser(res.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user');
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

  const toggleExperimental = () =>
    user &&
    runAction(() =>
      usersApi.setFeatureFlag(id, UserFeatureFlagKey.Experimental, !user.featureFlags.experimental),
    );

  const name =
    user &&
    (user.displayName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      user.email ||
      user.id);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/admin/users">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to users
        </Link>
      </Button>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error || !user ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            {error ?? 'User not found'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{name}</h1>
            {user.isSuspended ? (
              <Badge variant="destructive">Suspended</Badge>
            ) : (
              <Badge variant="secondary">Active</Badge>
            )}
            {user.isPlatformAdmin && <Badge>Platform admin</Badge>}
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="User ID" value={user.id} mono />
                <Field label="Email" value={user.email ?? '—'} />
                <Field label="Username" value={user.username ?? '—'} />
                <Field label="Display name" value={user.displayName ?? '—'} />
                <Field label="Created" value={formatDateTime(user.createdAt)} />
                <Field label="Updated" value={formatDateTime(user.updatedAt)} />
                {user.deletedAt && (
                  <Field label="Suspended at" value={formatDateTime(user.deletedAt)} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Memberships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="Active pools" value={String(user.poolCount)} />
                <Field label="Owner of" value={String(user.membership.owner)} />
                <Field label="Admin of" value={String(user.membership.admin)} />
                <Field label="Member of" value={String(user.membership.member)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature flags</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Experimental</div>
                <div className="text-xs text-muted-foreground">
                  {user.featureFlags.experimental ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <Button
                variant={user.featureFlags.experimental ? 'destructive' : 'default'}
                size="sm"
                disabled={busy}
                onClick={() => void toggleExperimental()}
              >
                {user.featureFlags.experimental ? 'Disable' : 'Enable'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {user.isSuspended ? (
                <Button
                  disabled={busy}
                  onClick={() => void runAction(() => usersApi.restore(id))}
                >
                  Restore user
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void runAction(() => usersApi.suspend(id))}
                >
                  Suspend user
                </Button>
              )}

              {/* #84 impersonation is deferred — disabled seam only, no handler. */}
              <Button variant="outline" disabled title="Coming soon (#84)">
                Impersonate (coming soon)
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
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
