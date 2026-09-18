'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { ChartCard, ChartEmpty, HorizontalBarChart, StatTile } from '@/components/admin/charts';
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
 * ⚠️ THE MAP IS NOT BUILT YET, AND THE PANEL SAYS WHY. The tiles CDN serves
 * ranged reads correctly but carries no `Access-Control-Allow-Origin`, and its
 * OPTIONS preflight 403s — so `maplibre-gl` in a browser would be blocked
 * whatever we wrote. It needs a `terraform apply` on `infra/map-tiles/`
 * (poolmobile#649). Until then the panel reports how much data is READY to
 * plot, which is a different statement from "no data" and the only honest one.
 */
export function GeographyTab({ data, days }: StatsTabProps) {
  const { geography } = data;
  const [measure, setMeasure] = useState<GeographyMeasure>('users');

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
          labelWidth={180}
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
                  <TableHead>City</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Pools</TableHead>
                  <TableHead className="text-right">{`New (${days}d)`}</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.map((city) => (
                  <TableRow key={city.key}>
                    <TableCell className="font-medium">{city.display}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {city.regionCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {city.countryCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{city.userCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{city.poolCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {measure === 'users' ? city.newUserCount : city.newPoolCount}
                    </TableCell>
                    <TableCell className="text-right">
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
            labelWidth={150}
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
            labelWidth={150}
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
 * counts below prove it; what is missing is a CORS rule on the tiles CDN
 * (poolmobile#649), which is a `terraform apply` on `infra/map-tiles/`. The
 * measurement, for whoever picks this up: a ranged `GET` on
 * `basemap/us.pmtiles` returns **206** with a correct `content-range`, so
 * pmtiles itself is fine — but that response carries no
 * `Access-Control-Allow-Origin`, and the `OPTIONS` preflight returns **403**.
 * `maplibre-gl` is deliberately NOT a dependency of this repo yet: adding it
 * before the tiles are readable would ship a blank canvas that fails in the
 * console instead of a panel that explains itself.
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
          Tiles not readable
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
            The map tiles are not readable from a browser yet — this is a CORS
            rule on the tiles CDN, not missing data.
          </p>
          <p className="max-w-prose text-xs text-muted-foreground">
            A ranged request for the basemap succeeds (206, correct
            content-range), but the response carries no
            <code className="mx-1">Access-Control-Allow-Origin</code>
            and the preflight is refused — so any browser map would be blocked
            whatever renderer we used. It needs a <code>terraform apply</code> on{' '}
            <code>infra/map-tiles/</code> (poolmobile#649). The native app reads
            the same tiles directly and is unaffected.
          </p>
          <p className="text-xs text-muted-foreground">
            Ready to plot the moment it lands:{' '}
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
