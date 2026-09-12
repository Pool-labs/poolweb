'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ImpersonationSessions } from '@/components/admin/ImpersonationSessions';
import { adminsApi, AdminApiError } from '@/lib/admin/adminApi';
import { formatDate } from '@/lib/admin/format';
import type { AdminAllowlistEntry } from '@/lib/admin/types';

/**
 * Admins — manage the DB-backed admin allowlist (the source of truth for who
 * may log in). Adding an email lets that person request an admin code and
 * become an admin on their first login; removing an email revokes their access.
 * The `isActiveAdmin` badge distinguishes an admin who has logged in (active)
 * from one who's been invited but hasn't logged in yet.
 *
 * All calls go through the same-origin `/admin/api/allowlist*` proxy, which
 * injects the Bearer server-side; no token ever touches client JS.
 *
 * Also hosts the #84 "Impersonation sessions" oversight list (poolmobile
 * #590): mutual oversight of "view as" is admin governance, so it lives here
 * beside the roster of who holds admin access rather than on any user page.
 */
export default function AdminAdminsPage() {
  const [entries, setEntries] = useState<AdminAllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Email currently being removed (for per-row spinner + disabling).
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminsApi.list();
      setEntries(res.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    setAddError(null);
    setNotice(null);
    try {
      await adminsApi.add(email);
      setNewEmail('');
      setNotice(`Added ${email} to the admin allowlist.`);
      await load();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 409) {
        setAddError(`${email} is already on the list.`);
      } else {
        setAddError(err instanceof Error ? err.message : 'Could not add that email.');
      }
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (email: string) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Remove ${email} from the admin allowlist? Their admin access will be revoked.`,
      )
    ) {
      return;
    }
    setRemovingEmail(email);
    setError(null);
    setNotice(null);
    try {
      await adminsApi.remove(email);
      setNotice(`Removed ${email} from the admin allowlist.`);
      await load();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 400) {
        setError("You can't remove yourself from the admin allowlist.");
      } else if (err instanceof AdminApiError && err.status === 409) {
        setError("You can't remove the last admin.");
      } else {
        setError(err instanceof Error ? err.message : 'Could not remove that email.');
      }
    } finally {
      setRemovingEmail(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admins</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        This is the list that controls who can log in. Add an email and that person can request an
        admin code and becomes an admin on their first login; remove an email and their access is
        revoked.
      </p>

      <Card>
        <CardContent className="space-y-3 p-4">
          <form onSubmit={onAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="email"
              placeholder="admin@poolapp.co"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={adding}
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !newEmail.trim()}>
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add admin
                </>
              )}
            </Button>
          </form>
          {addError && (
            <Alert variant="destructive">
              <AlertDescription>{addError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No admins on the list</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.email}>
                      <TableCell className="font-medium">{entry.email}</TableCell>
                      <TableCell>
                        {entry.isActiveAdmin ? (
                          <Badge variant="secondary">Active admin</Badge>
                        ) : (
                          <Badge variant="outline">Invited</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={removingEmail !== null}
                          onClick={() => void onRemove(entry.email)}
                        >
                          {removingEmail === entry.email ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="mr-1 h-4 w-4" />
                              Remove
                            </>
                          )}
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

      <ImpersonationSessions />
    </div>
  );
}
