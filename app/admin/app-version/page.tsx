'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, Smartphone } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { appVersionApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import {
  APP_VERSION_MINIMUM_PATTERN,
  AppPlatform,
  type AppVersionRequirementRecord,
} from '@/lib/admin/types';

/**
 * App version — the #313 force-update gate's configuration (poolmobile #590).
 *
 * ⚠️ THIS IS THE HIGHEST-BLAST-RADIUS CONTROL IN THE PRODUCT, and that is the
 * argument for it having a page rather than being left to `curl`. A minimum one
 * release too high blocks EVERY installed binary below it, behind a screen with
 * no way past it — and the only undo is this same control. Nobody reaches for a
 * shell command while a fleet is dark.
 *
 * Three things the UI is responsible for saying out loud, because the server
 * structurally cannot:
 *
 *  1. WHAT ARMING IT DOES. The gate is not a nudge with a dismiss.
 *  2. THE RUNBOOK RULE. It may only ever name a version LIVE IN BOTH STORES,
 *     and never while a review build is in flight. The API cannot know what
 *     Apple has approved, so this is a written gate — which means the only
 *     place it can be stated to the person arming it is here.
 *  3. THAT IT FAILS OPEN. A device that cannot reach the API is not gated. It
 *     is a nudge with teeth, not a security control, and reading it as the
 *     latter is how somebody concludes an old binary is unreachable when it is
 *     merely offline.
 *
 * It invents no server behaviour: `GET` always answers both platforms, and
 * `PUT` with `minimumVersion: null` is exactly how clearing works.
 */

const PLATFORM_LABEL: Record<AppPlatform, string> = {
  [AppPlatform.Ios]: 'iOS',
  [AppPlatform.Android]: 'Android',
};

/** Ordered so the page renders the same way whatever order the API answers in. */
const PLATFORM_ORDER: AppPlatform[] = [AppPlatform.Ios, AppPlatform.Android];

export default function AdminAppVersionPage() {
  const [records, setRecords] = useState<AppVersionRequirementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Per-platform draft + in-flight state, so arming iOS never disables Android
  // or blanks its field.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<AppPlatform | null>(null);
  const [rowError, setRowError] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await appVersionApi.list();
      setRecords(rows);
      // Seed each draft with what is currently armed, so the operator can SEE
      // what they are about to replace. The audit row carries the previous
      // value for the same reason: it is what somebody asks while undoing.
      setDrafts(
        Object.fromEntries(rows.map((row) => [row.platform, row.minimumVersion ?? ''])),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load version requirements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recordFor = (platform: AppPlatform): AppVersionRequirementRecord | undefined =>
    records.find((row) => row.platform === platform);

  const write = async (
    platform: AppPlatform,
    minimumVersion: string | null,
  ): Promise<void> => {
    setPending(platform);
    setNotice(null);
    setRowError((prev) => ({ ...prev, [platform]: null }));
    try {
      await appVersionApi.set({ platform, minimumVersion });
      setNotice(
        minimumVersion === null
          ? `Cleared the ${PLATFORM_LABEL[platform]} minimum. Nothing is blocked on that platform.`
          : `${PLATFORM_LABEL[platform]} now requires ${minimumVersion}. Every installed build below it is blocked.`,
      );
      await load();
    } catch (e) {
      setRowError((prev) => ({
        ...prev,
        [platform]: e instanceof Error ? e.message : 'Could not save that.',
      }));
    } finally {
      setPending(null);
    }
  };

  const onArm = (platform: AppPlatform) => {
    const value = (drafts[platform] ?? '').trim();
    if (!value) {
      setRowError((prev) => ({
        ...prev,
        [platform]: 'Enter a version, or use Clear to remove the minimum. An empty field is not the same as clearing.',
      }));
      return;
    }
    if (!APP_VERSION_MINIMUM_PATTERN.test(value)) {
      setRowError((prev) => ({
        ...prev,
        [platform]:
          'Use a plain dotted store version, e.g. 1.2.0. A suffix like 1.2.0-staging would be ignored rather than ranked, which is worse than being refused.',
      }));
      return;
    }

    const current = recordFor(platform)?.minimumVersion;
    // ⚠️ The confirmation ECHOES THE EXACT VERSION and names what it replaces.
    // A blank "are you sure?" on the one control that can strand a whole fleet
    // is not a confirmation, it is a speed bump.
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        [
          `Require ${PLATFORM_LABEL[platform]} ${value}?`,
          '',
          current
            ? `This REPLACES the current minimum of ${current}.`
            : 'There is no minimum set for this platform today.',
          '',
          `Every installed ${PLATFORM_LABEL[platform]} build below ${value} will be blocked at launch, behind a screen with no way past it.`,
          '',
          `Only name a version that is LIVE IN BOTH STORES. Never arm this while a review build is in flight.`,
        ].join('\n'),
      );
    if (!confirmed) return;

    void write(platform, value);
  };

  const onClear = (platform: AppPlatform) => {
    const current = recordFor(platform)?.minimumVersion;
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        `Clear the ${PLATFORM_LABEL[platform]} minimum${current ? ` of ${current}` : ''}?\n\nNothing will be blocked on that platform. This is the undo path — it is safe.`,
      );
    if (!confirmed) return;
    void write(platform, null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          App version
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The force-update gate. A binary below the minimum is stopped at launch and sent to the
          store. The environment this applies to is the one named in the strip above.
        </p>
      </div>

      {/* Stated on the page, not in a tooltip: this is the screen where the
          consequence has to be unmissable. */}
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p>
            <strong>Arming this blocks every installed build below the version you name</strong>,
            at launch, behind a screen whose only action is a link to the store. There is no
            dismiss.
          </p>
          <p>
            Only ever name a version that is <strong>already live in both stores</strong>, and
            never while a review build is in flight. Nothing here can check that — the API cannot
            know what Apple has approved.
          </p>
          <p className="text-xs opacity-90">
            It fails open: a device that cannot reach the API enters the app. This is a nudge with
            teeth, not a security control.
          </p>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {PLATFORM_ORDER.map((platform) => {
            const row = recordFor(platform);
            const armed = Boolean(row?.minimumVersion);
            const busy = pending === platform;
            return (
              <Card key={platform}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium">{PLATFORM_LABEL[platform]}</h2>
                    {/* "Not set" is a STATE, not an absence — it is the ordinary
                        one, and rendering a dash would read as a failed load. */}
                    <Badge variant={armed ? 'destructive' : 'secondary'}>
                      {armed ? `Requires ${row?.minimumVersion}` : 'No minimum set'}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {row
                      ? `Last changed ${formatDateTime(row.updatedAt)}${
                          row.updatedById ? '' : ' (before anyone set it)'
                        }`
                      : 'Never set.'}
                  </p>

                  <div className="flex gap-2">
                    <Input
                      value={drafts[platform] ?? ''}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [platform]: e.target.value }))
                      }
                      placeholder="1.2.0"
                      inputMode="decimal"
                      disabled={busy}
                      aria-label={`Minimum ${PLATFORM_LABEL[platform]} version`}
                    />
                    <Button onClick={() => onArm(platform)} disabled={busy}>
                      {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Require
                    </Button>
                  </div>

                  {rowError[platform] && (
                    <p className="text-sm text-destructive">{rowError[platform]}</p>
                  )}

                  {/* ⚠️ CLEAR IS ALWAYS PRESENT AND ALWAYS ENABLED WHEN ARMED.
                      It is the undo for the whole feature, so it must never be
                      behind a menu, a hover, or a second page — the moment it is
                      needed is the moment nobody can find it. */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onClear(platform)}
                    disabled={busy || !armed}
                  >
                    {armed
                      ? `Clear the ${PLATFORM_LABEL[platform]} minimum`
                      : 'Nothing to clear'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
