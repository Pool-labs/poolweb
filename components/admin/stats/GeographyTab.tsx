'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { ChartCard, ChartEmpty, HorizontalBarChart, StatTile } from '@/components/admin/charts';
import { useNarrowViewport } from '@/components/admin/useNarrowViewport';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { chartColor } from '@/lib/admin/charts';
import { hasTileSource, mapTilesBaseUrl } from '@/lib/admin/mapStyle';
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
import type { AdminGeographyCity, AdminGeographyVenuePin } from '@/lib/admin/types';
import type { StatsTabProps } from './types';

/** The bar chart's cap. The table below it is the full (capped) list. */
const CITY_BARS = 25;

/**
 * The map's drawn height, in px.
 *
 * ⚠️ Sized for its OWN sub-tab, not for a strip under the charts. At 420px,
 * stacked beneath the bars and the table, the continent was wide and flat and
 * the circles were too small to compare. With the view to itself it can be
 * tall enough to actually read.
 */
const MAP_HEIGHT = 620;

/**
 * ⚠️ `ssr: false` IS LOAD-BEARING, NOT AN OPTIMISATION. `maplibre-gl` reaches
 * for `window` and a WebGL context at module scope, so server-rendering it
 * fails the BUILD, not just the page. Loading it lazily also keeps ~200 KB of
 * renderer out of every other admin route's bundle — this is the only page
 * that draws a map.
 */
const GeographyMap = dynamic(
  () => import('./GeographyMap').then((m) => m.GeographyMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground"
        style={{ height: MAP_HEIGHT }}
      >
        Loading the map…
      </div>
    ),
  },
);

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
  // Breakdown first: the table is the complete answer and the map is the
  // readable one. A reader arriving at Geography wants the numbers.
  const [view, setView] = useState('breakdown');
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

      {/*
        ⚠️ THE MAP GETS ITS OWN SUB-TAB, and the reason is room. Stacked under
        the bars and the table it had a 420px strip of a continent, which is
        enough to see that circles exist and not enough to read them. On its own
        view it takes the full height and the marks become legible.

        Two views over ONE dataset and ONE measure toggle — the toggle sits
        above this switch on purpose, so moving between Breakdown and Map never
        silently changes what is being counted.
      */}
      <Tabs value={view} onValueChange={setView} className="w-full">
        <TabsList>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <MapPanel
            cities={geography?.cities}
            venuePinList={geography?.exactVenuePools}
            measure={measure}
            withPoint={mappable.withPoint}
            withoutPoint={mappable.withoutPoint}
            venuePins={geography?.exactVenuePools.length}
            venuePinsTruncated={geography?.exactVenuePoolsTruncated}
            loaded={geography !== null}
          />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4 space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * The map.
 *
 * ⚠️ IT WAS AN EXPLAINED EMPTY STATE FOR MOST OF #33's LIFE, AND THE REASON IS
 * WORTH KEEPING. The tiles CDN served correct ranged reads but carried no
 * `Access-Control-Allow-Origin` and refused the preflight, so a browser map
 * was impossible whatever we wrote — adding `maplibre-gl` then would have
 * shipped a blank canvas failing in the console instead of a panel that
 * explained itself. poolmobile#649 fixed the CORS configuration; verified live
 * before this was built: a ranged `GET` returns 206 with
 * `access-control-allow-origin: *` and `access-control-expose-headers` naming
 * `Content-Range` (pmtiles cannot read a byte range without it), the glyph PBFs
 * carry the same headers, and the preflight answers 200.
 *
 * ⚠️ THE MAP IS NEVER THE ONLY ROUTE TO THE DATA, and the panel below it is not
 * decoration. A canvas carries no text, so it is unreadable to a screen reader
 * and unsearchable; the city table further down this tab is the accessible
 * equivalent and stays the complete answer.
 *
 * ⚠️ AND IT STILL SAYS WHAT IT COULD NOT PLOT. `mappableCities` counts the
 * cities with no point — the server has neither a curated anchor nor a public
 * pool to average — and those are real users the map silently omits. A map
 * looks complete by its nature, so the count of what is missing from it is
 * printed underneath rather than left to be inferred (#116's rule, applied to
 * a surface that has no empty state to hang it on).
 */
function MapPanel({
  cities,
  venuePinList,
  measure,
  withPoint,
  withoutPoint,
  venuePins,
  venuePinsTruncated,
  loaded,
}: {
  cities: AdminGeographyCity[] | undefined;
  venuePinList: AdminGeographyVenuePin[] | undefined;
  measure: GeographyMeasure;
  withPoint: number;
  withoutPoint: number;
  venuePins: number | undefined;
  venuePinsTruncated: boolean | undefined;
  loaded: boolean;
}) {
  const baseUrl = mapTilesBaseUrl();
  const configured = hasTileSource(baseUrl);
  const coverage = (
    <p className="mt-3 text-xs text-muted-foreground">
      Plotted: <strong className="tabular-nums">{withPoint}</strong>{' '}
      {withPoint === 1 ? 'city' : 'cities'} with a point
      {withoutPoint > 0 && (
        <>
          {' '}
          — ⚠️ <span className="tabular-nums">{withoutPoint}</span> not on the map
          (no curated anchor and no public pool to average), so the table below
          lists more than you can see here
        </>
      )}
      {venuePins !== undefined && (
        <>
          . <strong className="tabular-nums">{venuePins}</strong> exact-venue{' '}
          {venuePins === 1 ? 'pin' : 'pins'}
          {venuePinsTruncated ? ' (capped)' : ''}
        </>
      )}
      . City points sit on a coarsened grid; no individual&apos;s location is here.
    </p>
  );

  return (
    <ChartCard
      title="Map"
      description="One circle per city — AREA is the count, not radius — plus exact pins for pools that opted into showing their venue"
    >
      {!loaded ? (
        <ChartEmpty
          reason="unavailable"
          detail="The geography metric did not answer, so there is nothing to plot either way."
        />
      ) : !configured ? (
        // ⚠️ Unset is a first-class state, not a crash: a local checkout
        // without the env var, or an environment where the CDN was never
        // configured. Say which, rather than rendering a broken canvas.
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-prose text-sm font-medium">
            No map tiles origin is configured for this deployment.
          </p>
          <p className="max-w-prose text-xs text-muted-foreground">
            Set <code>NEXT_PUBLIC_MAP_TILES_BASE_URL</code> to the CloudFront
            distribution in front of the tiles bucket. This says nothing about
            the data — the city table below is unaffected.
          </p>
        </div>
      ) : (
        <>
          <GeographyMap
            baseUrl={baseUrl}
            cities={cities}
            venuePins={venuePinList}
            measure={measure}
            height={MAP_HEIGHT}
          />
          {coverage}
        </>
      )}
    </ChartCard>
  );
}
