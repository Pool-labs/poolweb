'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewAsDialog } from '@/components/admin/ViewAsDialog';
import {
  ABSENT,
  ChipList,
  DetailCard,
  Field,
  TextBlock,
  Unreported,
  yesNo,
} from '@/components/admin/detail';
import { usersApi } from '@/lib/admin/adminApi';
import { parseCityKey } from '@/lib/admin/cityKey';
import { formatDate, formatDateTime, humanizeEnum } from '@/lib/admin/format';
import {
  UserFeatureFlagKey,
  hasRichUserDetail,
  type AdminUserDetail,
  type AdminUserPaymentHandles,
} from '@/lib/admin/types';

/**
 * User detail (#83 management + #84 view-as), regrouped into sections by
 * poolweb #31 over the poolmobile #618 contract.
 *
 * Every section renders against BOTH the narrow (pre-#618) and the widened
 * payload: the #112 switch can point this page at a production API that has
 * not been dispatched since June, and a section the API does not report says
 * so in one line (`Unreported`) instead of a column of dashes.
 *
 * ⚠️ The widened user read is AUDITED ON VIEW server-side
 * (`admin.user_detail_viewed`, poolmobile #618's second decision) because it
 * assembles an identified person's full profile, including the sensitive tier
 * (raw coordinates, exact DOB, payment handles). So this page fetches ONCE per
 * visit and after an explicit action — never on a timer.
 */
export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewAsOpen, setViewAsOpen] = useState(false);

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
            {/* Staging-only context (#566 / #479): rendered ONLY when present,
                so a production page carries no trace of it. */}
            {user.seedCohort && <Badge variant="outline">Seed cohort: {user.seedCohort}</Badge>}
            {user.demoMode && <Badge variant="outline">Demo mode: {user.demoMode}</Badge>}
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <IdentitySection user={user} />
            <LocationSection user={user} />
            <ProfileSection user={user} />
            <EngagementSection user={user} />
            <PaymentHandlesSection user={user} />
            <StagingSection user={user} />
          </div>

          <MembershipsSection user={user} />

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

              {/* #84 "view as" (poolmobile #590, option 1): a read-only,
                  15-minute, audited session with the token shown ONCE. The two
                  refusals knowable up front (platform admin / suspended) are
                  stated here rather than left to a round trip; every other
                  refusal — self, a race, a live session — is the server's call
                  and the dialog surfaces its message verbatim. */}
              {user.isPlatformAdmin || user.isSuspended ? (
                <div className="flex flex-col gap-1">
                  <Button variant="outline" disabled>
                    View as
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {user.isPlatformAdmin
                      ? 'Platform admins cannot be impersonated.'
                      : 'A suspended account cannot be impersonated.'}
                  </span>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setViewAsOpen(true)}>
                  View as
                </Button>
              )}
            </CardContent>
          </Card>

          <ViewAsDialog
            targetUserId={user.id}
            targetName={name ?? user.id}
            open={viewAsOpen}
            onOpenChange={setViewAsOpen}
          />
        </>
      )}
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function IdentitySection({ user }: { user: AdminUserDetail }) {
  return (
    <DetailCard title="Identity">
      <Field label="User ID" value={user.id} mono />
      <Field label="Email" value={user.email} />
      <Field label="Username" value={user.username ? `@${user.username}` : null} />
      <Field label="Display name" value={user.displayName} />
      <Field
        label="Name"
        value={[user.firstName, user.lastName].filter(Boolean).join(' ') || null}
      />
      <Field label="Platform admin" value={user.isPlatformAdmin ? 'Yes' : 'No'} />
      <Field label="Status" value={user.isSuspended ? 'Suspended' : 'Active'} />
      {user.deletedAt && <Field label="Suspended at" value={formatDateTime(user.deletedAt)} />}
      <Field label="Created" value={formatDateTime(user.createdAt)} />
      <Field label="Updated" value={formatDateTime(user.updatedAt)} />
    </DetailCard>
  );
}

function LocationSection({ user }: { user: AdminUserDetail }) {
  const rich = hasRichUserDetail(user);
  const key = parseCityKey(user.locationCityKey);
  return (
    <DetailCard
      title="Location"
      description="City-level, from the canonical city key (#128/#469). Coordinates are the sensitive tier."
    >
      {!rich ? (
        <Unreported what="Location fields" />
      ) : (
        <>
          <Field label="City" value={user.locationCity} />
          <Field label="Region" value={key?.regionCode} />
          <Field
            label="Country"
            value={key ? (key.countryName ?? ABSENT) : null}
          />
          <Field label="City key" value={user.locationCityKey} mono />
          <Field label="Sharing location" value={yesNo(user.shareLocation)} />
          <Field label="Last updated" value={formatDateTime(user.locationUpdatedAt)} />
          <Field label="Coordinates" mono value={formatCoords(user.locationLat, user.locationLng)} />
        </>
      )}
    </DetailCard>
  );
}

function ProfileSection({ user }: { user: AdminUserDetail }) {
  const rich = hasRichUserDetail(user);
  return (
    <DetailCard title="Profile" description="What the person told Discover about themselves.">
      {!rich ? (
        <Unreported what="Profile fields" />
      ) : (
        <>
          <Field label="Date of birth" value={formatDate(user.dateOfBirth)} />
          <Field label="Age" value={deriveAge(user.dateOfBirth)} />
          <Field label="Gender" value={user.gender ? humanizeEnum(user.gender) : null} />
          <Field
            label="Occupation"
            value={
              user.occupationDetail ??
              (user.occupation ? humanizeEnum(user.occupation) : null)
            }
          />
          <Field
            label="Lifestyle"
            value={
              user.lifestyleDetail ??
              (user.lifestyleStatus ? humanizeEnum(user.lifestyleStatus) : null)
            }
          />
          <Field label="Discoverable" value={yesNo(user.isDiscoverable)} />
          <ChipList label="Interests" items={user.interests} labelFn={humanizeEnum} />
          <ChipList label="Custom interests" items={user.customInterests} />
          <TextBlock label="Bio" value={user.bio} />
        </>
      )}
    </DetailCard>
  );
}

function EngagementSection({ user }: { user: AdminUserDetail }) {
  const rich = hasRichUserDetail(user);
  return (
    <DetailCard title="Engagement" description="Activity, points, and how the account signs in.">
      {!rich ? (
        <Unreported what="Engagement fields" />
      ) : (
        <>
          <Field label="Last seen" value={formatDateTime(user.lastActivityAt)} />
          <Field label="Points balance" value={user.pointBalance} />
          <Field label="Lifetime points" value={user.lifetimePoints} />
          <Field
            label="Streak"
            value={
              user.currentStreak === undefined
                ? null
                : `${user.currentStreak} current · ${user.longestStreak ?? ABSENT} longest`
            }
          />
          <Field
            label="Email deliverability"
            value={
              user.emailUndeliverableAt
                ? `Undeliverable since ${formatDateTime(user.emailUndeliverableAt)}`
                : 'Deliverable'
            }
          />
          <Field label="Password set" value={yesNo(user.hasPassword)} />
          <Field label="Linked sign-in">
            {user.identities && user.identities.length > 0
              ? user.identities
                  .map((i) => `${humanizeEnum(i.provider)} (${formatDate(i.linkedAt)})`)
                  .join(', ')
              : 'None'}
          </Field>
          <Field label="Trusted devices" value={user.trustedDeviceCount} />
          <Field label="Push tokens" value={user.pushTokenCount} />
        </>
      )}
    </DetailCard>
  );
}

const PAYMENT_HANDLE_LABELS: Readonly<Record<keyof AdminUserPaymentHandles, string>> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  paypal: 'PayPal',
  zelle: 'Zelle',
  interac: 'Interac',
};

function PaymentHandlesSection({ user }: { user: AdminUserDetail }) {
  const rich = hasRichUserDetail(user);
  const handles = user.paymentHandles;
  return (
    <DetailCard
      title="Payment handles"
      description="Sensitive: a Zelle handle is an email, an Interac handle is a phone number. Shown verbatim (#146)."
    >
      {!rich ? (
        <Unreported what="Payment handles" />
      ) : (
        <>
          {(Object.keys(PAYMENT_HANDLE_LABELS) as (keyof AdminUserPaymentHandles)[]).map((k) => (
            <Field key={k} label={PAYMENT_HANDLE_LABELS[k]} value={handles?.[k] ?? null} mono />
          ))}
          <Field
            label="Preferred rail"
            value={
              user.preferredPaymentProvider
                ? PAYMENT_HANDLE_LABELS[
                    user.preferredPaymentProvider.toLowerCase() as keyof AdminUserPaymentHandles
                  ] ?? humanizeEnum(user.preferredPaymentProvider)
                : null
            }
          />
        </>
      )}
    </DetailCard>
  );
}

/** Staging-only context — the card exists ONLY when the payload carries it. */
function StagingSection({ user }: { user: AdminUserDetail }) {
  if (!user.seedCohort && !user.demoMode) return null;
  return (
    <DetailCard
      title="Staging context"
      description="Seeded-cohort and demo-mode markers (#566 / #479). Never present in production."
    >
      <Field label="Seed cohort" value={user.seedCohort} />
      <Field label="Demo mode" value={user.demoMode} />
    </DetailCard>
  );
}

function MembershipsSection({ user }: { user: AdminUserDetail }) {
  const pools = user.pools;
  return (
    <DetailCard title="Memberships">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
        <Field label="Active pools" value={user.poolCount} />
        <Field label="Owner of" value={user.membership.owner} />
        <Field label="Admin of" value={user.membership.admin} />
        <Field label="Member of" value={user.membership.member} />
      </div>
      {pools === undefined ? (
        <Unreported what="The pool rows" />
      ) : pools.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not an active member of any pool.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pools.map((m) => (
                <TableRow key={m.poolId}>
                  <TableCell>
                    <Link href={`/admin/pools/${m.poolId}`} className="font-medium underline">
                      {m.poolName}
                    </Link>
                  </TableCell>
                  <TableCell>{humanizeEnum(m.role)}</TableCell>
                  <TableCell>
                    {m.poolStatus ? humanizeEnum(m.poolStatus) : ABSENT}
                    {m.poolVisibility ? ` · ${humanizeEnum(m.poolVisibility)}` : ''}
                  </TableCell>
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCoords(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Whole years since the ISO date, UTC-anchored like the app's own age derivation. */
function deriveAge(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return String(age);
}
