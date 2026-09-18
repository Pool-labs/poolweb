import { describe, expect, it } from 'vitest';

import {
  cityCount,
  cityRows,
  countryCount,
  countryLabel,
  mappableCities,
  regionCount,
  regionLabel,
} from '@/lib/admin/stats';
import { AdminGeographyCentroidSource, type AdminGeographyCity } from '@/lib/admin/types';

function city(over: Partial<AdminGeographyCity> & { key: string }): AdminGeographyCity {
  return {
    display: over.key,
    regionCode: null,
    countryCode: null,
    userCount: 0,
    poolCount: 0,
    newUserCount: 0,
    newPoolCount: 0,
    lat: null,
    lng: null,
    centroidSource: null,
    ...over,
  };
}

describe('cityRows', () => {
  const cities = [
    city({ key: 'columbia|MO|US', display: 'Columbia, MO', userCount: 9, poolCount: 1 }),
    city({ key: 'austin|TX|US', display: 'Austin, TX', userCount: 4, poolCount: 7 }),
    city({ key: 'amman||JO', display: 'Amman', userCount: 0, poolCount: 3 }),
  ];

  it('ranks by the SELECTED measure, not by the payload order', () => {
    // The response is sorted by users+pools combined, so the pools view has to
    // re-rank or Austin (7 pools) would sit below Columbia (1).
    expect(cityRows(cities, 'pools').map((r) => r.label)).toEqual([
      'Austin, TX',
      'Amman',
      'Columbia, MO',
    ]);
    expect(cityRows(cities, 'users').map((r) => r.label)).toEqual(['Columbia, MO', 'Austin, TX']);
  });

  it('DROPS a city with none of the selected measure', () => {
    // ⚠️ Amman has pools but no users. A zero-length bar on the users chart
    // labels a city that nobody is in.
    expect(cityRows(cities, 'users').map((r) => r.label)).not.toContain('Amman');
  });

  it('carries the key through untouched, for the `?city=` filter', () => {
    // The key is opaque and matched by equality server-side; re-deriving it
    // from the display name would unfilter every legacy city.
    expect(cityRows(cities, 'users')[0].key).toBe('columbia|MO|US');
  });

  it('breaks ties on the key so the order does not wobble between reloads', () => {
    const tied = [
      city({ key: 'b|  |US', display: 'Bee', userCount: 5 }),
      city({ key: 'a||US', display: 'Ayy', userCount: 5 }),
    ];
    expect(cityRows(tied, 'users').map((r) => r.label)).toEqual(['Ayy', 'Bee']);
  });

  it('survives an absent payload', () => {
    expect(cityRows(undefined, 'users')).toEqual([]);
  });
});

describe('counts per measure', () => {
  it('reads the right column', () => {
    const c = city({ key: 'x', userCount: 3, poolCount: 8 });
    expect(cityCount(c, 'users')).toBe(3);
    expect(cityCount(c, 'pools')).toBe(8);
    expect(countryCount({ countryCode: 'US', userCount: 3, poolCount: 8, cityCount: 2 }, 'pools')).toBe(8);
    expect(
      regionCount(
        { countryCode: 'US', regionCode: 'MO', regionName: 'Missouri', userCount: 3, poolCount: 8, cityCount: 1 },
        'users',
      ),
    ).toBe(3);
  });
});

describe('labels', () => {
  it('names a country from its code', () => {
    expect(countryLabel('US')).toBe('United States');
  });

  it('says a missing country is MISSING rather than guessing one', () => {
    // #128's own rule: a legacy key that never recorded a country gets no
    // inferred one.
    expect(countryLabel(null)).toBe('No country recorded');
  });

  it('always pairs a region with its country — "MO" alone is ambiguous', () => {
    expect(
      regionLabel({ countryCode: 'US', regionCode: 'MO', regionName: 'Missouri', userCount: 0, poolCount: 0, cityCount: 0 }),
    ).toBe('Missouri, United States');
    expect(
      regionLabel({ countryCode: 'CA', regionCode: 'ON', regionName: null, userCount: 0, poolCount: 0, cityCount: 0 }),
    ).toBe('ON · Canada');
  });
});

describe('mappableCities', () => {
  it('counts what WOULD plot, and what would not', () => {
    // The map panel reports this instead of rendering empty: the data is here,
    // the tiles are not readable (poolmobile#649).
    const cities = [
      city({ key: 'a', lat: 38.9, lng: -92.3, centroidSource: AdminGeographyCentroidSource.Curated }),
      city({ key: 'b', lat: 30.2, lng: -97.7, centroidSource: AdminGeographyCentroidSource.Pools }),
      city({ key: 'c' }),
    ];
    expect(mappableCities(cities)).toEqual({ withPoint: 2, withoutPoint: 1 });
  });

  it('treats a half-point as unmappable', () => {
    expect(mappableCities([city({ key: 'a', lat: 38.9, lng: null })])).toEqual({
      withPoint: 0,
      withoutPoint: 1,
    });
  });

  it('survives an absent payload', () => {
    expect(mappableCities(undefined)).toEqual({ withPoint: 0, withoutPoint: 0 });
  });
});
