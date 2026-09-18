'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { ChartCard, ChartEmpty, HorizontalBarChart, StatTile } from '@/components/admin/charts';
import { useNarrowViewport } from '@/components/admin/useNarrowViewport';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { chartColor } from '@/lib/admin/charts';
import {
  cityCount,
  cityRows,
  countryCount,
  countryLabel,
  GEOGRAPHY_MEASURE_LABEL,
  mappableCities,
  regionCount,
  regionLabel,
  topNWithOther,
  type GeographyMeasure,
} from '@/lib/admin/stats';
import type { StatsTabProps } from './types';

/** The bar chart's cap. The table below it is the full (capped) list. */
const CITY_BARS = 25;

/**
 * Geography — where users and pools ARE (#33 Part B).
 *
 * ⚠️ THE PRIVACY POSTURE IS THE SERVER'S, AND THIS PAGE CANNOT WEAKEN IT.
 * Site-wide user geography is CITY-LEVEL COUNTS ONLY: the endpoint's user query
 * selects no coordinate, so there is no individual location on this page to
 * leak. The only exact points anywhere here belong to PUBLIC pools whose owner
 * opted into showing their venue (#21) — data Discover already publishes to
 * every signed-in user. An individual's coordinates stay on the AUDITED user
 * detail page, which is why this aggregate is allowed to be un-audited: it
 * names nobody.
 *
 * ⚠️ THE MAP IS NOT BUILT YET, AND THE PANEL SAYS SO WITHOUT BLAMING ANYTHING.
 * It used to be BLOCKED: the tiles CDN served ranged reads correctly but
 * carried no `Access-Control-Allow-Origin` and its preflight 403'd, so any
 * browser map would have failed whatever we wrote. poolmobile#649 shipped that
 * CORS rule, so the block is gone and only the work is left — `maplibre-gl` is
 * still not a dependency of this repo. Until it is, the panel reports how much
 * data is READY to plot, which is a different statement from "no data" and the
 * only honest one.
 */
export function GeographyTab({ data, days }: StatsTabProps) {
  const { geography } = data;
  const [measure, setMeasure] = useState<GeographyMeasure>('users');
  // A 180px category axis on a 390px screen leaves the bars under half the
  // card; recharts wants a number, so this cannot be a responsive class.
  const narrow = useNarrowViewport();

  const cities = geography?.cities ?? [];
  const bars = topNWithOther(cityRows(cities, measure), CITY_BARS);
  const mappable = mappableCities(cities);

  const countries = [...(geography?.countries ?? [])].sort(
    (a, b) => countryCount(b, measure) - countryCount(a, measure),
  );
  const regions = [...(geography?.regions ?? [])].sort(
    (a, b) => regionCount(b, measure) - regionCount(a, measure),
  );

  const withoutCity =
    measure === 'users' ? geography?.usersWithoutCity : geography?.poolsWithoutCity;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Count"
          className="inline-flex rounded-md border p-0.5"
        >
          {(Object.keys(GEOGRAPHY_MEASURE_LABEL) as GeographyMeasure[]).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={measure === m ? 'default' : 'ghost'}
              aria-pressed={measure === m}
              onClick={() => setMeasure(m)}
            >
              {GEOGRAPHY_MEASURE_LABEL[m]}
            </Button>
          ))}
        </div>
        {geography?.citiesTruncated && (
          // Never let a capped list read as the whole world.
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Showing the most populous {cities.length} cities — there are more.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Cities"
          value={geography ? cities.length : undefined}
          sub={geography?.citiesTruncated ? 'Capped — the roll-ups below still count every city' : undefined}
        />
        <StatTile
          label={`Countries`}
          value={geography ? geography.countries.length : undefined}
          sub="Rolled up over every city, before the cap"
        />
        <StatTile
          label={`${GEOGRAPHY_MEASURE_LABEL[measure]} with no city`}
          value={withoutCity}
          sub="Never asked, or asked and skipped — not an error"
        />
      </div>

      <ChartCard
        title={`${GEOGRAPHY_MEASURE_LABEL[measure]} by city`}
        description={`Top ${CITY_BARS} by count. One row per canonical city key (#128/#469), so the same city is never split across spellings.`}
      >
        <HorizontalBarChart
          rows={bars}
          xLabel={GEOGRAPHY_MEASURE_LABEL[measure]}
          valueName={GEOGRAPHY_MEASURE_LABEL[measure]}
          labelWidth={narrow ? 104 : 180}
          emptyReason={geography ? 'none-yet' : 'unavailable'}
          emptyDetail={
            geography
              ? `No city has any ${measure} recorded against it yet.`
              : 'The geography metric did not answer for this environment.'
          }
        />
      </ChartCard>

      <ChartCard
        title="Every city"
        description={`Users and pools side by side. "New" is the last ${days} days; the totals are all time. Each row filters the Users and Pools lists.`}
      >
        {!geography ? (
          <ChartEmpty
            reason="unavailable"
            detail="The geography metric did not answer for this environment."
          />
        ) : cities.length === 0 ? (
          <ChartEmpty reason="none-yet" detail="No city has been recorded yet." />
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/*
                    ⚠️ Region, Country and "New" are hidden below `md`, and the
                    ACTION never is. Seven columns at phone width pushed the
                    link that makes a row useful off the right edge, where the
                    only way to reach it was a horizontal scroll with no
                    affordance. Region and country are also both derivable from
                    the city name beside them, which is what makes them the
                    right ones to drop.
                  */}
                  <TableHead className="px-2 sm:px-4">City</TableHead>
                  <TableHead className="hidden md:table-cell">Region</TableHead>
                  <TableHead className="hidden md:table-cell">Country</TableHead>
                  <TableHead className="px-2 text-right sm:px-4">Users</TableHead>
                  <TableHead className="px-2 text-right sm:px-4">Pools</TableHead>
                  <TableHead className="hidden text-right md:table-cell">{`New (${days}d)`}</TableHead>
                  <TableHead className="px-2 text-right sm:px-4">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.map((city) => (
                  <TableRow key={city.key}>
                    <TableCell className="px-2 font-medium sm:px-4">{city.display}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {city.regionCode ?? '—'}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {city.countryCode ?? '—'}
                    </TableCell>
                    <TableCell className="px-2 text-right tabular-nums sm:px-4">
                      {city.userCount}
                    </TableCell>
                    <TableCell className="px-2 text-right tabular-nums sm:px-4">
                      {city.poolCount}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                      {measure === 'users' ? city.newUserCount : city.newPoolCount}
                    </TableCell>
                    <TableCell className="px-2 text-right sm:px-4">
                      {/*
                        The key travels EXACTLY as published — encoded for the
                        URL, never re-derived or tidied. Legacy two-segment keys
                        are published too, and the server matches by equality.
                      */}
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/admin/${measure}?city=${encodeURIComponent(city.key)}`}
                          // Every row's link says the same word, so the city has
                          // to be in the accessible name or a screen reader hears
                          // "Users, Users, Users".
                          aria-label={`Open ${GEOGRAPHY_MEASURE_LABEL[measure].toLowerCase()} in ${city.display}`}
                        >
                          {GEOGRAPHY_MEASURE_LABEL[measure]}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="By country"
          description="Rolled up over EVERY city, before the city cap — so a truncated list above never under-counts a country."
        >
          <HorizontalBarChart
            rows={countries
              .map((c) => ({ label: countryLabel(c.countryCode), value: countryCount(c, measure) }))
              .filter((r) => r.value > 0)}
            xLabel={GEOGRAPHY_MEASURE_LABEL[measure]}
            valueName={GEOGRAPHY_MEASURE_LABEL[measure]}
            color={chartColor('series-3')}
            labelWidth={narrow ? 104 : 150}
            emptyReason={geography ? 'none-yet' : 'unavailable'}
          />
        </ChartCard>

        <ChartCard
          title="By region"
          description="US states and Canadian provinces (#469) — the only subdivisions the city key records."
        >
          <HorizontalBarChart
            rows={regions
              .map((r) => ({ label: regionLabel(r), value: regionCount(r, measure) }))
              .filter((r) => r.value > 0)}
            xLabel={GEOGRAPHY_MEASURE_LABEL[measure]}
            valueName={GEOGRAPHY_MEASURE_LABEL[measure]}
            color={chartColor('series-4')}
            labelWidth={narrow ? 104 : 150}
            emptyReason={geography ? 'none-yet' : 'unavailable'}
            emptyDetail={
              geography ? 'No city key carries a US/CA subdivision yet.' : undefined
            }
          />
        </ChartCard>
      </div>

      <MapPanel
        withPoint={mappable.withPoint}
        withoutPoint={mappable.withoutPoint}
        venuePins={geography?.exactVenuePools.length}
        venuePinsTruncated={geography?.exactVenuePoolsTruncated}
        loaded={geography !== null}
      />
    </div>
  );
}

/**
 * The map, as an explained empty state.
 *
 * ⚠️ This is NOT "no data" and must never read as it. The data is here and the
 * counts below prove it; what is missing is the RENDERER. `maplibre-gl` is not
 * a dependency of this repo, so there is nothing yet to draw the markers with.
 *
 * ⚠️ AND IT IS NO LONGER BLOCKED — do not restore the old copy. This panel used
 * to say the tiles were unreadable from a browser, and that was true: a ranged
 * `GET` on `basemap/us.pmtiles` returned 206 with a correct `content-range`,
 * but carried no `Access-Control-Allow-Origin`, and the `OPTIONS` preflight
 * returned 403. poolmobile#649 shipped the CORS configuration and the fix is
 * live — the same ranged `GET` now returns 206 WITH `access-control-allow-
 * origin: *` and `access-control-expose-headers` naming `Content-Range`
 * (pmtiles needs that one to read a byte range at all), and the preflight
 * answers 200. Whoever builds this can add the dependency and go.
 */
function MapPanel({
  withPoint,
  withoutPoint,
  venuePins,
  venuePinsTruncated,
  loaded,
}: {
  withPoint: number;
  withoutPoint: number;
  venuePins: number | undefined;
  venuePinsTruncated: boolean | undefined;
  loaded: boolean;
}) {
  return (
    <ChartCard
      title="Map"
      description="One marker per city, sized by count, plus exact pins for pools that opted into showing their venue"
      aside={
        <span className="whitespace-nowrap rounded-full border border-amber-500/50 bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Renderer not built
        </span>
      }
    >
      {!loaded ? (
        <ChartEmpty
          reason="unavailable"
          detail="The geography metric did not answer, so there is nothing to plot either way."
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-prose text-sm font-medium text-amber-700 dark:text-amber-400">
            The map itself is not built yet — this is missing work, not missing
            data and no longer a blocked dependency.
          </p>
          <p className="max-w-prose text-xs text-muted-foreground">
            The tiles CDN used to refuse browser reads, which is why this panel
            existed. poolmobile#649 shipped the CORS rule and it is live: a
            ranged request for the basemap returns 206 with
            <code className="mx-1">Access-Control-Allow-Origin</code>
            and the preflight succeeds. What is left is the renderer —{' '}
            <code>maplibre-gl</code> is not a dependency of this app yet. The
            native app reads the same tiles directly and was never affected.
          </p>
          <p className="text-xs text-muted-foreground">
            Ready to plot the moment it is drawn:{' '}
            <strong className="tabular-nums">{withPoint}</strong>{' '}
            {withPoint === 1 ? 'city has' : 'cities have'} a point
            {withoutPoint > 0 && (
              <>
                {' '}
                (<span className="tabular-nums">{withoutPoint}</span> without one — no
                curated anchor and no public pool to average)
              </>
            )}
            {venuePins !== undefined && (
              <>
                , and <strong className="tabular-nums">{venuePins}</strong> exact-venue{' '}
                {venuePins === 1 ? 'pin' : 'pins'}
                {venuePinsTruncated ? ' (capped)' : ''}
              </>
            )}
            .
          </p>
        </div>
      )}
    </ChartCard>
  );
}
