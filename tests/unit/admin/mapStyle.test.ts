import { describe, expect, it } from 'vitest';

import {
  BASEMAP_KEY,
  CITY_CIRCLE,
  MAP_SOURCE_ID,
  buildAdminMapStyle,
  buildGlyphsUrl,
  buildPmtilesUrl,
  circleColorExpression,
  circleRadiusExpression,
  cityFeatures,
  hasTileSource,
  maxCount,
  venueFeatures,
  type MapDataPalette,
  type MapPalette,
} from '@/lib/admin/mapStyle';
import { AdminGeographyCentroidSource } from '@/lib/admin/types';
import type { AdminGeographyCity, AdminGeographyVenuePin } from '@/lib/admin/types';

/**
 * The Geography map's pure half (poolweb#33).
 *
 * The rendering itself is WebGL and cannot be asserted here. What can be — and
 * what actually breaks — is the style document, the URL shapes MapLibre and
 * pmtiles refuse, and the GeoJSON projection, which is where a city quietly
 * vanishes or a circle tells a lie about its size.
 */

const city = (over: Partial<AdminGeographyCity> = {}): AdminGeographyCity => ({
  key: 'columbia|mo|us',
  display: 'Columbia, MO',
  regionCode: 'MO',
  countryCode: 'US',
  userCount: 10,
  poolCount: 2,
  newUserCount: 1,
  newPoolCount: 0,
  lat: 38.95,
  lng: -92.33,
  centroidSource: AdminGeographyCentroidSource.Curated,
  ...over,
});

const PALETTE: MapPalette = {
  land: '#f6f4ef',
  water: '#dbe7f2',
  green: '#e8efe4',
  boundary: '#c3cbd6',
  label: '#6b7789',
  labelHalo: '#ffffff',
};

describe('tile URLs', () => {
  it('fully qualifies the pmtiles inner URL', () => {
    // ⚠️ MapLibre/pmtiles reject `pmtiles://host/file` — the inner URL must
    // carry its scheme. The same trap the mobile style has a test for.
    expect(buildPmtilesUrl('https://cdn.example.com')).toBe(
      `pmtiles://https://cdn.example.com/${BASEMAP_KEY}`,
    );
    expect(buildPmtilesUrl('https://cdn.example.com')).toMatch(/^pmtiles:\/\/https:\/\//);
  });

  it('tolerates a trailing slash on the configured origin', () => {
    // Somebody will paste the URL with one. A doubled slash 404s the archive.
    expect(buildPmtilesUrl('https://cdn.example.com///')).toBe(
      `pmtiles://https://cdn.example.com/${BASEMAP_KEY}`,
    );
    expect(buildGlyphsUrl('https://cdn.example.com/')).toBe(
      'https://cdn.example.com/fonts/{fontstack}/{range}.pbf',
    );
  });

  it('leaves the glyph placeholders for MapLibre to substitute', () => {
    // These are not ours to interpolate — MapLibre fills them per fontstack
    // and per codepoint range, so they must survive verbatim.
    const url = buildGlyphsUrl('https://cdn.example.com');
    expect(url).toContain('{fontstack}');
    expect(url).toContain('{range}');
  });

  it('treats an unset or blank origin as no tile source', () => {
    expect(hasTileSource(undefined)).toBe(false);
    expect(hasTileSource('')).toBe(false);
    expect(hasTileSource('   ')).toBe(false);
    expect(hasTileSource('https://cdn.example.com')).toBe(true);
  });
});

describe('buildAdminMapStyle', () => {
  it('references exactly one source, through the pmtiles protocol', () => {
    const style = buildAdminMapStyle('https://cdn.example.com', PALETTE) as {
      sources: Record<string, { url: string; attribution: string }>;
      glyphs: string;
      layers: { id: string; 'source-layer'?: string }[];
    };

    expect(Object.keys(style.sources)).toEqual([MAP_SOURCE_ID]);
    expect(style.sources[MAP_SOURCE_ID].url).toMatch(/^pmtiles:\/\/https:\/\//);
    expect(style.glyphs).toContain('{fontstack}');
  });

  it('carries the OSM attribution, which is a licence obligation', () => {
    const style = buildAdminMapStyle('https://cdn.example.com', PALETTE) as {
      sources: Record<string, { attribution: string }>;
    };
    expect(style.sources[MAP_SOURCE_ID].attribution).toContain('OpenStreetMap');
  });

  it('never references the clutter layers AT ALL', () => {
    // ⚠️ Stronger than styling them invisible: a layer that is not referenced
    // cannot be turned back on by a paint tweak, and the tiles for it are
    // never decoded. Roads and POIs behind the circles would compete with the
    // only marks on this map that carry a number.
    const style = buildAdminMapStyle('https://cdn.example.com', PALETTE) as {
      layers: { 'source-layer'?: string }[];
    };
    const referenced = style.layers.map((l) => l['source-layer']).filter(Boolean);

    for (const banned of ['roads', 'pois', 'transit', 'buildings', 'landuse']) {
      expect(referenced).not.toContain(banned);
    }
    expect(referenced).toContain('earth');
    expect(referenced).toContain('boundaries');
  });

  it('paints every colour from the passed palette, never a literal', () => {
    const swapped: MapPalette = { ...PALETTE, land: '#123456', water: '#654321' };
    const style = buildAdminMapStyle('https://cdn.example.com', swapped) as {
      layers: { id: string; paint?: Record<string, unknown> }[];
    };
    const background = style.layers.find((l) => l.id === 'background');
    const water = style.layers.find((l) => l.id === 'water');

    expect(background?.paint?.['background-color']).toBe('#123456');
    expect(water?.paint?.['fill-color']).toBe('#654321');
  });

  it('is pure — the same inputs give a byte-identical document', () => {
    expect(JSON.stringify(buildAdminMapStyle('https://a.example', PALETTE))).toBe(
      JSON.stringify(buildAdminMapStyle('https://a.example', PALETTE)),
    );
  });
});

describe('cityFeatures', () => {
  it('drops a city with no point, because it cannot be drawn', () => {
    // ⚠️ And the panel prints how many were dropped. A map looks complete by
    // its nature, so an omission nobody states reads as an absence of users.
    const collection = cityFeatures(
      [city({ key: 'a' }), city({ key: 'b', lat: null, lng: null })],
      'users',
    );
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties.key).toBe('a');
  });

  it('drops a ZERO count rather than drawing a circle that says nothing', () => {
    // At `measure: 'pools'` a user-only city is exactly this case.
    const collection = cityFeatures([city({ poolCount: 0 })], 'pools');
    expect(collection.features).toHaveLength(0);
  });

  it('puts coordinates in GeoJSON order — lng, lat', () => {
    // ⚠️ The classic silent one: swapped, Columbia MO lands in Somalia and the
    // map still renders happily.
    const [feature] = cityFeatures([city({ lat: 38.95, lng: -92.33 })], 'users').features;
    expect(feature.geometry.coordinates).toEqual([-92.33, 38.95]);
  });

  it('orders biggest first so small circles paint on top', () => {
    // MapLibre draws a source's features in order, so the reverse would bury
    // every small city under the largest one and make it unhoverable.
    const collection = cityFeatures(
      [city({ key: 'small', userCount: 2 }), city({ key: 'big', userCount: 50 })],
      'users',
    );
    expect(collection.features.map((f) => f.properties.key)).toEqual(['big', 'small']);
  });

  it('reads the measure it was given', () => {
    const [byUsers] = cityFeatures([city({ userCount: 10, poolCount: 2 })], 'users').features;
    const [byPools] = cityFeatures([city({ userCount: 10, poolCount: 2 })], 'pools').features;
    expect(byUsers.properties.count).toBe(10);
    expect(byPools.properties.count).toBe(2);
  });

  it('reads missing data as no features, never as a feature with no point', () => {
    expect(cityFeatures(undefined, 'users').features).toEqual([]);
  });
});

describe('venueFeatures', () => {
  it('projects the #21 pins, carrying no address or owner', () => {
    const pins: AdminGeographyVenuePin[] = [
      { id: 'p1', name: 'The Blue Note', lat: 38.95, lng: -92.33, venueAddress: '17 N 9th St' },
    ];
    const [feature] = venueFeatures(pins).features;

    expect(feature.geometry.coordinates).toEqual([-92.33, 38.95]);
    expect(feature.properties).toEqual({ id: 'p1', name: 'The Blue Note' });
    // The address is deliberately not projected onto the map layer — it is not
    // needed to draw a dot, and every property here ends up in the client bundle.
    expect(JSON.stringify(feature.properties)).not.toContain('17 N 9th St');
  });
});

describe('circleRadiusExpression', () => {
  it('scales by AREA, not radius', () => {
    // ⚠️ THE BUBBLE-MAP LIE THIS EXISTS TO PREVENT. With radius ∝ count, a city
    // with 4× the users draws 16× the ink and looks like the whole product.
    // `sqrt` in the interpolation input is what makes area carry the value.
    const expression = circleRadiusExpression(100) as unknown[];
    expect(expression[0]).toBe('interpolate');
    expect(expression[2]).toEqual(['sqrt', ['get', 'count']]);
    // The ramp's top stop is sqrt(max), not max.
    expect(expression[5]).toBe(10);
    expect(expression[6]).toBe(CITY_CIRCLE.MAX_RADIUS);
  });

  it('is a flat radius when the data cannot support a ramp', () => {
    // One city, or every city tied: interpolating between equal stops is
    // degenerate, and a ramp implies a spread that is not there.
    expect(circleRadiusExpression(1)).toBe(CITY_CIRCLE.MIN_RADIUS);
    expect(circleRadiusExpression(0)).toBe(CITY_CIRCLE.MIN_RADIUS);
  });
});

describe('maxCount', () => {
  it('spans the data actually on screen', () => {
    const collection = cityFeatures(
      [city({ key: 'a', userCount: 3 }), city({ key: 'b', userCount: 41 })],
      'users',
    );
    expect(maxCount(collection)).toBe(41);
  });

  it('is 0 for an empty collection, so the ramp goes flat instead of NaN', () => {
    expect(maxCount({ type: 'FeatureCollection', features: [] })).toBe(0);
  });
});

describe('circleColorExpression', () => {
  const DATA: MapDataPalette = {
    circleLow: '#93c5fd',
    circleHigh: '#1d4ed8',
    circleStroke: '#1e3a8a',
    venue: '#eb6834',
  };

  it('never emits a CSS variable — the GPU cannot resolve one', () => {
    /**
     * ⚠️ THE BUG THIS SHIPPED WITH. The circles were painted with
     * `seriesColor(0)`, which returns `var(--chart-series-1)`. MapLibre parses
     * paint properties for the GPU, so it REFUSED the whole layer —
     * `circle-color: color expected, "var(--chart-series-1)" found` — and the
     * map rendered a perfect basemap with nothing plotted on it.
     */
    const expression = JSON.stringify(circleColorExpression(100, DATA));
    expect(expression).not.toContain('var(');
    expect(expression).toContain('#93c5fd');
    expect(expression).toContain('#1d4ed8');
  });

  it('ramps light → dark by count, on the SAME scale as the radius', () => {
    // Sequential, one hue, and `sqrt` so colour and area agree about what a
    // count means — redundant encoding, which is the point.
    const expression = circleColorExpression(100, DATA) as unknown[];
    expect(expression[0]).toBe('interpolate');
    expect(expression[2]).toEqual(['sqrt', ['get', 'count']]);
    expect(expression[4]).toBe(DATA.circleLow);
    expect(expression[6]).toBe(DATA.circleHigh);
  });

  it('is a flat colour when there is no spread to ramp across', () => {
    // One city, or all tied: a ramp would imply a difference that is not there.
    expect(circleColorExpression(1, DATA)).toBe(DATA.circleHigh);
    expect(circleColorExpression(0, DATA)).toBe(DATA.circleHigh);
  });
});
