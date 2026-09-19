import type { AdminGeographyCity, AdminGeographyVenuePin } from './types';
import { cityCount, type GeographyMeasure } from './stats';

/**
 * The admin map's basemap style and data layers (poolweb#33, unblocked by
 * poolmobile#649).
 *
 * ── Why this is not the mobile style ────────────────────────────────────────
 *
 * `apps/mobile/src/components/discover/map/mapStyle.ts` is Pool's full
 * cartographic style: buildings, four road classes with casings, landcover,
 * landuse, two label tiers. This is a DELIBERATE REDUCTION of it, not a copy
 * that fell behind — keep it that way.
 *
 * Discover is a street-level surface: somebody is looking for a pool at a
 * venue, so roads and buildings are the context that makes a pin mean
 * something. This map is the opposite question — "where are our users and
 * pools, across the world" — read at continent and country zoom, where every one
 * of those layers is pure noise behind the circles that carry the actual
 * answer. Rendering less is the correct behaviour here, and it also means far
 * less surface to drift out of sync between two repos that hand-copy from each
 * other (the #618/#623 lesson).
 *
 * ⚠️ AUTHORED AGAINST THE PROTOMAPS BASEMAP v4 SCHEMA. The `source-layer`
 * names and `kind` values below belong to that schema and are meaningless
 * against any other tile source — vector-tile schemas are not portable. Both
 * repos read the SAME self-hosted archive, so if the archive is ever rebuilt on
 * a newer schema, both styles move together.
 *
 * ⚠️ THE TILES BECAME READABLE FROM A BROWSER ONLY IN poolmobile#649. Before
 * it, the CDN served correct ranged reads but no `Access-Control-Allow-Origin`
 * and refused the preflight, so a browser map was impossible whatever we wrote
 * — which is why this file did not exist and the panel was an explained empty
 * state. Verified live before building: a ranged `GET` returns 206 with
 * `access-control-allow-origin: *` and `access-control-expose-headers` naming
 * `Content-Range` (pmtiles cannot read a byte range without it), the glyph PBFs
 * carry the same headers, and the preflight answers 200.
 */

/**
 * Key of the `.pmtiles` basemap inside the bucket. Mobile's twin
 * (poolmobile `MAP_TILES.BASEMAP_KEY`).
 *
 * ⚠️ THE WHOLE PLANET, zoom 0–15. It was `basemap/us.pmtiles`, a continental-US
 * extract, and this map showed it: pan anywhere else and the land was blank,
 * except the parts of Europe and Africa that happened to share a low-zoom tile
 * with the US bounding box — which made it look like a deliberate crop rather
 * than missing data. Pool launched internationally (poolmobile, 2026-09-19).
 * The archive is read by range request, so this map fetches only the handful
 * of low-zoom tiles it draws, never the 138 GB file.
 */
export const BASEMAP_KEY = 'basemap/world.pmtiles';
/** Glyph (font PBF) prefix — self-hosted beside the tiles. */
export const GLYPHS_KEY = 'fonts';

/** Fontstack names as published by protomaps/basemaps-assets. */
export const MAP_FONTS = {
  REGULAR: 'Noto Sans Regular',
  MEDIUM: 'Noto Sans Medium',
} as const;

/**
 * OpenStreetMap attribution is a LICENCE OBLIGATION of serving OSM-derived
 * tiles, not a courtesy. MapLibre renders it in its own control, which is kept
 * rather than suppressed.
 */
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors';

export const MAP_SOURCE_ID = 'protomaps';
export const CITY_SOURCE_ID = 'pool-cities';
export const VENUE_SOURCE_ID = 'pool-venues';

/** Source layers of the Protomaps v4 schema this style references. */
const SOURCE_LAYERS = {
  EARTH: 'earth',
  WATER: 'water',
  LANDCOVER: 'landcover',
  BOUNDARIES: 'boundaries',
  PLACES: 'places',
} as const;

/**
 * Camera. The WHOLE WORLD: this map's job is the shape of the whole
 * distribution, and opening zoomed into one city — or, as it did until the
 * international launch, onto the continental US — would misrepresent it.
 *
 * Centred slightly north of the equator because that is where the land (and so
 * the users) is; zoom 1 fits the inhabited world in the admin card's width.
 * `MIN_ZOOM` 0.5 rather than 0 so the world never shrinks to a stamp in the
 * middle of the card.
 */
export const MAP_CAMERA = {
  CENTER: [10, 25] as [number, number],
  ZOOM: 1,
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 14,
} as const;

/**
 * Circle geometry.
 *
 * ⚠️ `MIN_RADIUS` is a VISIBILITY floor, not a scale point. A city with one
 * user still has to be findable on a continental map, so the ramp starts well
 * above "a dot"; below about 7px a semi-transparent circle reads as noise on
 * the basemap.
 */
export const CITY_CIRCLE = {
  MIN_RADIUS: 8,
  MAX_RADIUS: 34,
  /** Semi-transparent so overlapping cities remain individually readable. */
  FILL_OPACITY: 0.65,
  STROKE_WIDTH: 2,
  /** Below this the label is omitted — it would collide with its neighbours. */
  LABEL_MIN_ZOOM: 3.5,
} as const;

/** The venue pin, which is a different KIND of mark, not a smaller circle. */
export const VENUE_PIN = {
  RADIUS: 5,
  STROKE_WIDTH: 2,
} as const;

/**
 * `pmtiles://` + a FULLY QUALIFIED inner URL. A bare host is not accepted, and
 * the trailing slash is stripped so a base URL written either way works.
 */
export const buildPmtilesUrl = (baseUrl: string): string =>
  `pmtiles://${baseUrl.replace(/\/+$/, '')}/${BASEMAP_KEY}`;

export const buildGlyphsUrl = (baseUrl: string): string =>
  `${baseUrl.replace(/\/+$/, '')}/${GLYPHS_KEY}/{fontstack}/{range}.pbf`;

/** `true` when a tiles origin is configured at all. Unset is a real state. */
export const hasTileSource = (baseUrl: string | undefined): baseUrl is string =>
  typeof baseUrl === 'string' && baseUrl.trim().length > 0;

/** The configured tiles origin, or `undefined`. Inlined at build time. */
export const mapTilesBaseUrl = (): string | undefined =>
  process.env.NEXT_PUBLIC_MAP_TILES_BASE_URL;

// ─── GeoJSON for the data layers ─────────────────────────────────────────────

export interface CityFeatureProps {
  key: string;
  display: string;
  count: number;
}

export interface VenueFeatureProps {
  id: string;
  name: string;
}

type PointFeature<P> = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: P;
};

export interface FeatureCollection<P> {
  type: 'FeatureCollection';
  features: PointFeature<P>[];
}

/**
 * Cities that can actually be drawn, as GeoJSON points.
 *
 * ⚠️ A CITY WITH NO POINT IS DROPPED HERE AND COUNTED ELSEWHERE. The server
 * reports `lat`/`lng` as null when it has neither a curated anchor nor a public
 * pool to average, and those cities are real users the map simply cannot place.
 * The panel states how many were left off (`mappableCities`) — silently
 * plotting fewer cities than the table lists is the one thing this map must not
 * do, because a map looks complete by nature.
 *
 * ⚠️ Zero-count cities are dropped too: a circle whose radius encodes 0 is a
 * mark that says nothing while occupying space, and at `measure: 'pools'` a
 * user-only city is exactly that.
 */
export function cityFeatures(
  cities: AdminGeographyCity[] | undefined,
  measure: GeographyMeasure,
): FeatureCollection<CityFeatureProps> {
  const features = (cities ?? [])
    .filter((city) => city.lat !== null && city.lng !== null)
    .map((city) => ({ city, count: cityCount(city, measure) }))
    .filter(({ count }) => count > 0)
    // Biggest first so the smaller circles paint ON TOP and stay clickable;
    // MapLibre draws a source's features in order.
    .sort((a, b) => b.count - a.count || a.city.key.localeCompare(b.city.key))
    .map(({ city, count }) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [city.lng as number, city.lat as number] as [number, number],
      },
      properties: { key: city.key, display: city.display, count },
    }));

  return { type: 'FeatureCollection', features };
}

/**
 * The #21 exact-venue pins — PUBLIC pools whose owner opted into showing the
 * venue, which Discover already publishes to every signed-in user.
 *
 * ⚠️ These are the ONLY exact coordinates on this surface. Every city circle
 * sits on a 0.1° grid centroid; an individual's coordinates never appear here
 * at all and stay on the audited user detail page.
 */
export function venueFeatures(
  pins: AdminGeographyVenuePin[] | undefined,
): FeatureCollection<VenueFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: (pins ?? []).map((pin) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [pin.lng, pin.lat] as [number, number],
      },
      properties: { id: pin.id, name: pin.name },
    })),
  };
}

/** The largest count in a collection, or 0 — the top of the radius ramp. */
export function maxCount(collection: FeatureCollection<CityFeatureProps>): number {
  return collection.features.reduce((max, f) => Math.max(max, f.properties.count), 0);
}

/**
 * Circle radius as a MapLibre expression interpolating count → px.
 *
 * ⚠️ AREA, NOT RADIUS, CARRIES THE VALUE — `sqrt` is the whole point. A circle
 * whose RADIUS is proportional to its count overstates the big ones by the
 * square: a city with 4× the users would draw 16× the ink. This is the classic
 * bubble-map lie, and on a founders' dashboard it would make one city look like
 * the entire product.
 *
 * `max` is passed in rather than hardcoded so the ramp always spans the data
 * actually on screen; when every city has the same count the interpolation
 * would be degenerate, so the caller gets a flat radius instead.
 */
export function circleRadiusExpression(max: number): unknown {
  if (max <= 1) return CITY_CIRCLE.MIN_RADIUS;
  return [
    'interpolate',
    ['linear'],
    ['sqrt', ['get', 'count']],
    1,
    CITY_CIRCLE.MIN_RADIUS,
    Math.sqrt(max),
    CITY_CIRCLE.MAX_RADIUS,
  ];
}

/**
 * The basemap style document.
 *
 * Pure — same base URL and palette in, byte-identical style out — so it is
 * unit-assertable even though the rendering it drives is not.
 *
 * `palette` is passed in rather than read from CSS here because the style is a
 * plain JSON document handed to WebGL: it cannot resolve a CSS custom property,
 * so the caller reads the computed values and passes them. That is also what
 * makes a dark variant a palette swap and nothing else.
 */
export interface MapPalette {
  land: string;
  water: string;
  green: string;
  boundary: string;
  label: string;
  labelHalo: string;
}

/**
 * The colours of the DATA marks, already resolved to real values.
 *
 * ⚠️ RESOLVED IS THE WHOLE POINT. MapLibre parses paint properties for the GPU
 * and cannot read a CSS custom property — given `var(--chart-series-1)` it
 * rejects the entire layer with `circle-color: color expected`. That is how the
 * city circles came to not exist at all while the basemap rendered perfectly:
 * the layer was refused, the map looked fine, and nothing was plotted.
 */
export interface MapDataPalette {
  /** Sequential ramp for the city circles: fewest → most. */
  circleLow: string;
  circleHigh: string;
  circleStroke: string;
  venue: string;
}

/**
 * Circle FILL as a MapLibre expression: a sequential ramp on the count.
 *
 * ⚠️ Colour here is REDUNDANT with size, deliberately. Both encode the same
 * count, which is the one case where double-encoding is a feature: area is hard
 * to judge precisely, and a darker circle reads as "more" at a glance and
 * survives being small. One hue, light to dark — never a rainbow, which would
 * imply the categories are unordered.
 */
export function circleColorExpression(max: number, palette: MapDataPalette): unknown {
  if (max <= 1) return palette.circleHigh;
  return [
    'interpolate',
    ['linear'],
    ['sqrt', ['get', 'count']],
    1,
    palette.circleLow,
    Math.sqrt(max),
    palette.circleHigh,
  ];
}

export function buildAdminMapStyle(baseUrl: string, palette: MapPalette): unknown {
  return {
    version: 8,
    name: 'Pool Admin',
    glyphs: buildGlyphsUrl(baseUrl),
    sources: {
      [MAP_SOURCE_ID]: {
        type: 'vector',
        url: buildPmtilesUrl(baseUrl),
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers: [
      // Land everywhere first, so a tile gap reads as land rather than void.
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': palette.land },
      },
      {
        id: 'earth',
        type: 'fill',
        source: MAP_SOURCE_ID,
        'source-layer': SOURCE_LAYERS.EARTH,
        paint: { 'fill-color': palette.land },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: MAP_SOURCE_ID,
        'source-layer': SOURCE_LAYERS.LANDCOVER,
        filter: ['in', ['get', 'kind'], ['literal', ['forest', 'grassland', 'scrub']]],
        paint: { 'fill-color': palette.green, 'fill-opacity': 0.35 },
      },
      {
        id: 'water',
        type: 'fill',
        source: MAP_SOURCE_ID,
        'source-layer': SOURCE_LAYERS.WATER,
        paint: { 'fill-color': palette.water },
      },
      // Country and state lines: the only geography a national view needs, and
      // what makes an unlabelled circle locatable at all.
      {
        id: 'boundaries',
        type: 'line',
        source: MAP_SOURCE_ID,
        'source-layer': SOURCE_LAYERS.BOUNDARIES,
        filter: ['in', ['get', 'kind'], ['literal', ['country', 'region']]],
        paint: {
          'line-color': palette.boundary,
          'line-width': 0.8,
          'line-dasharray': [2, 2],
        },
      },
      // Place labels only, and only above the country tier. `roads`, `pois`,
      // `transit`, `buildings` and `landuse` are never referenced by any layer,
      // so that clutter is ABSENT rather than styled invisible.
      {
        id: 'places-region',
        type: 'symbol',
        source: MAP_SOURCE_ID,
        'source-layer': SOURCE_LAYERS.PLACES,
        minzoom: 3,
        filter: ['in', ['get', 'kind'], ['literal', ['country', 'region']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': [MAP_FONTS.MEDIUM],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 7, 13],
          'text-transform': 'uppercase',
        },
        paint: {
          'text-color': palette.label,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.5,
        },
      },
    ],
  };
}
