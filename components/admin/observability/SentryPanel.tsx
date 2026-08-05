'use client';

import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/admin/format';
import { isSourceTrustworthy, safeHttpUrl } from '@/lib/admin/observability';
import {
  ObservabilitySourceStatus,
  type ObservabilitySentrySummary,
} from '@/lib/admin/types';

import { SourceStatusNotice, SourceStatusPill } from './SourceStatusNotice';

/**
 * The Sentry half of the Errors / Health tab (#116) — GROUPED issues
 * ("happened 400×", "affected 12 users"), which a raw log query cannot produce,
 * plus mobile crash symbolication that lives only in Sentry.
 *
 * Two deliberate behaviours carried over from the API:
 *
 *  - `issuesUrl` is present whenever the ORG SLUG is configured, INCLUDING when
 *    the read API token is not. So the link-out is rendered independently of
 *    `status` — an unwired token degrades to "open Sentry", never to a dead
 *    panel. That is the whole point of the server returning the URL separately
 *    from the summary.
 *  - `summary` is null for every non-`Ok` status (fail-open, never an error
 *    response), so emptiness here is ambiguous by construction and the status
 *    notice is what disambiguates it.
 *
 * `permalink` / `issuesUrl` are the only values on this surface used as an
 * `href`, so both go through `safeHttpUrl` — `href` is one of the few React
 * props that still executes what you hand it (`javascript:`), and these strings
 * come from an upstream API.
 */
export function SentryPanel({
  status,
  issuesUrl,
  summary,
}: {
  status: ObservabilitySourceStatus;
  issuesUrl: string | null;
  summary: ObservabilitySentrySummary | null;
}) {
  const linkOut = safeHttpUrl(issuesUrl);
  const issues = summary?.issues ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">Sentry — grouped issues</CardTitle>
          <SourceStatusPill source="sentry" status={status} />
        </div>
        {linkOut ? (
          <Button asChild variant="outline" size="sm">
            <a href={linkOut} target="_blank" rel="noopener noreferrer">
              Open in Sentry
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">No Sentry org configured</span>
        )}
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-2">
        <SourceStatusNotice source="sentry" status={status} />

        {summary?.query && (
          // Echoed by the API so this heading cannot drift from what was asked.
          <p className="font-mono text-[11px] text-muted-foreground">query: {summary.query}</p>
        )}

        {issues.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {isSourceTrustworthy(status)
              ? 'No matching issues — Sentry was queried and returned nothing.'
              : 'No issues could be fetched. See the notice above for why.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="whitespace-nowrap">Last seen</TableHead>
                  <TableHead className="whitespace-nowrap">First seen</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const permalink = safeHttpUrl(issue.permalink);
                  return (
                    <TableRow key={issue.id}>
                      <TableCell className="max-w-[26rem]">
                        {/* Issue titles/culprits are upstream free text — TEXT ONLY. */}
                        <div className="break-words font-medium">{issue.title}</div>
                        {issue.culprit && (
                          <div className="break-all font-mono text-[11px] text-muted-foreground">
                            {issue.culprit}
                          </div>
                        )}
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {issue.shortId}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">
                        {issue.level ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{issue.count}</TableCell>
                      <TableCell className="text-right font-mono">{issue.userCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(issue.lastSeen)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(issue.firstSeen)}
                      </TableCell>
                      <TableCell className="text-right">
                        {permalink && (
                          <Button asChild variant="ghost" size="sm">
                            <a href={permalink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="sr-only">Open issue in Sentry</span>
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
