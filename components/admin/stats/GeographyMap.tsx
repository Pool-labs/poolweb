'use client';

import { useEffect, useRef, useState } from 'react';
import {
  GeoJSONSource,
  Map as MapLibre,
  NavigationControl,
  Popup,
  addProtocol,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import { Protocol } from 'pmtiles';

import {
  CITY_CIRCLE,
  CITY_SOURCE_ID,
  MAP_CAMERA,
  MAP_FONTS,
  VENUE_SOURCE_ID,
  buildAdminMapStyle,
  circleRadiusExpression,
  cityFeatures,
  maxCount,
  venueFeatures,
  type MapPalette,
} from '@/lib/admin/mapStyle';
import { GEOGRAPHY_MEASURE_LABEL, type GeographyMeasure } from '@/lib/admin/stats';
import type { AdminGeographyCity, AdminGeographyVenuePin } from '@/lib/admin/types';

// ⚠️ MapLibre's stylesheet is imported in `app/globals.css`, NOT here. This
// component is loaded through `next/dynamic({ ssr: false })`, so a CSS import
// in this file lands in the dynamic chunk and is applied only after that chunk
// hydrates — and until it is, the absolutely-positioned canvas escapes the card
// and paints at the top of the page. See the note in globals.css.

/**
 * The Geography map (poolweb#33), unblocked by poolmobile#649.
 *
 * ⚠️ CLIENT-ONLY, AND IT MUST STAY THAT WAY. `maplibre-gl` touches `window`
 * and WebGL at module scope, so it cannot be server-rendered; the parent
 * imports this through `next/dynamic` with `ssr: false`. Importing it directly
 * from a server component breaks the build, not just the page.
 *
 * ⚠️ MAPLIBRE-GL IS PINNED TO v5 AND MUST STAY THERE. On v6 this map renders a
 * completely BLANK canvas — no error, no empty state, no console warning, just
 * a correctly-sized canvas with nothing drawn. Measured against the real CDN by
 * counting requests to it: v6 makes ONE (the pmtiles header, then zero tile
 * ranges and zero glyph PBFs); v5 makes nine, carrying real tile data and the
 * fonts. v6 appears to load tiles somewhere a main-thread `addProtocol` handler
 * no longer reaches — it exports `importScriptInWorkers`, which is how a custom
 * protocol would be given to the workers. `pmtiles` declares no peer dependency
 * on maplibre, so a routine upgrade resolves a broken pair silently.
 * `tests/unit/admin/mapDeps.test.ts` is the guard, and carries the full
 * measurement and what to re-run before changing it.
 *
 * ⚠️ NAMED IMPORTS, NEVER A DEFAULT. `maplibre-gl` exports NO default —
 * `import maplibregl from 'maplibre-gl'` gives `undefined` at runtime. It
 * type-checks perfectly, because `allowSyntheticDefaultImports` invents the
 * default for the compiler, so the first sign of trouble is `Cannot read
 * properties of undefined (reading 'addProtocol')` in the browser, which takes
 * the whole React subtree down with it — the Geography tab's charts vanished
 * too. Measured here, not theorised: `pnpm typecheck` was green while the page
 * was broken.
 *
 * ⚠️ THE PMTILES PROTOCOL IS REGISTERED ONCE PER PAGE, GLOBALLY. MapLibre keeps
 * protocol handlers in module state, so registering per mount would stack
 * duplicate handlers across remounts. Hence the module-level guard: the map
 * reads the archive by HTTP range request, with no tile server in between.
 *
 * ⚠️ A FAILED BASEMAP MUST NOT TAKE THE DATA WITH IT. The circles are the
 * answer; the cartography is context. If the CDN is unreachable, the style
 * fails and MapLibre emits `error` — the panel then says so in words rather
 * than showing an empty grey rectangle that reads as "no users anywhere".
 *
 * ⚠️ BUT ONLY AN ERROR *BEFORE* `load` IS FATAL, and the distinction is a bug
 * fix. MapLibre emits `error` for transient, local things too — one tile that
 * 404s, one glyph range that is missing from the fontstack — and the first
 * version treated every one of them as fatal. A map that had drawn perfectly
 * well was replaced, seconds later, by "The map could not be drawn." Reported
 * from the live admin site.
 *
 * After `load`, an error means "something in this frame is missing", not "this
 * map does not work", so it is logged to the console and the map keeps running.
 *
 * ⚠️ AND THE CONTAINER IS NEVER UNMOUNTED, which is the other half of the same
 * fix. Swapping the container `<div>` out for a message while a live MapLibre
 * instance still holds it leaves the canvas orphaned mid-teardown. The failure
 * message is an OVERLAY inside the same container, so the element MapLibre was
 * handed exists for the whole life of the component.
 */

/** Registered at most once per page — see the note above. */
let protocolRegistered = false;

function registerPmtilesProtocol(): void {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

/**
 * Read the resolved map palette off the document.
 *
 * WebGL cannot resolve `var(--map-land)`, so the values are computed here and
 * baked into the style document. Called on mount and again whenever the theme
 * changes, because the resolved values change with it.
 */
function readPalette(element: HTMLElement): MapPalette {
  const styles = getComputedStyle(element);
  const read = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    land: read('--map-land', '#f6f4ef'),
    water: read('--map-water', '#dbe7f2'),
    green: read('--map-green', '#e8efe4'),
    boundary: read('--map-boundary', '#c3cbd6'),
    label: read('--map-label', '#6b7789'),
    labelHalo: read('--map-label-halo', '#ffffff'),
  };
}

interface GeographyMapProps {
  baseUrl: string;
  cities: AdminGeographyCity[] | undefined;
  venuePins: AdminGeographyVenuePin[] | undefined;
  measure: GeographyMeasure;
  /** Circle fill — the same hue the bar chart uses for this measure. */
  accent: string;
  /** Venue-pin fill, deliberately a different hue from the circles. */
  venueAccent: string;
  height: number;
}

export function GeographyMap({
  baseUrl,
  cities,
  venuePins,
  measure,
  accent,
  venueAccent,
  height,
}: GeographyMapProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibre | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Mount once. The data effect below updates sources in place, because
  // rebuilding the map on every filter change would refetch the basemap.
  useEffect(() => {
    if (!container.current || map.current) return;
    registerPmtilesProtocol();

    let instance: MapLibre;
    try {
      instance = new MapLibre({
        container: container.current,
        style: buildAdminMapStyle(baseUrl, readPalette(document.documentElement)) as never,
        center: MAP_CAMERA.CENTER,
        zoom: MAP_CAMERA.ZOOM,
        minZoom: MAP_CAMERA.MIN_ZOOM,
        maxZoom: MAP_CAMERA.MAX_ZOOM,
        // Nothing here is worth a rotated frame, and a tilted admin map is
        // harder to compare across sessions.
        pitchWithRotate: false,
        dragRotate: false,
        attributionControl: { compact: true },
      });
    } catch {
      // WebGL unavailable (a headless browser, a blocked GPU, an old machine).
      setFailed(true);
      return;
    }

    map.current = instance;
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    // ⚠️ Fatal ONLY before `load`. An error at that point means the style or the
    // source never came up, which is the silent-blank-canvas state this panel
    // exists to prevent. An error after it is one missing tile or glyph range,
    // and tearing the whole map down for that is worse than the gap.
    let loaded = false;
    instance.on('load', () => {
      loaded = true;
      setReady(true);
    });
    instance.on('error', (event: { error?: Error }) => {
      if (!loaded) {
        setFailed(true);
        return;
      }
      // eslint-disable-next-line no-console
      console.warn('[admin map] non-fatal after load:', event?.error?.message ?? event);
    });

    return () => {
      instance.remove();
      map.current = null;
    };
    // `baseUrl` is build-time constant; re-running would rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data: replace the two sources whenever the rows or the measure change.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;

    const cityCollection = cityFeatures(cities, measure);
    const venueCollection = venueFeatures(venuePins);
    const radius = circleRadiusExpression(maxCount(cityCollection));

    const upsert = (id: string, data: unknown): void => {
      const existing = instance.getSource(id);
      if (existing) {
        (existing as GeoJSONSource).setData(data as never);
        return;
      }
      instance.addSource(id, { type: 'geojson', data: data as never });
    };

    upsert(CITY_SOURCE_ID, cityCollection);
    upsert(VENUE_SOURCE_ID, venueCollection);

    if (!instance.getLayer('city-circles')) {
      instance.addLayer({
        id: 'city-circles',
        type: 'circle',
        source: CITY_SOURCE_ID,
        paint: {
          'circle-color': accent,
          'circle-opacity': 0.55,
          // A ring in the surface colour, so two overlapping circles read as
          // two rather than merging into one larger blob.
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-radius': radius as never,
        },
      });
      instance.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: CITY_SOURCE_ID,
        minzoom: CITY_CIRCLE.LABEL_MIN_ZOOM,
        layout: {
          'text-field': ['get', 'display'],
          'text-font': [MAP_FONTS.REGULAR],
          'text-size': 11,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          // Never invent a label position: where they collide, one is dropped
          // rather than moved somewhere it does not belong.
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': readPalette(document.documentElement).label,
          'text-halo-color': readPalette(document.documentElement).labelHalo,
          'text-halo-width': 1.5,
        },
      });
      instance.addLayer({
        id: 'venue-pins',
        type: 'circle',
        source: VENUE_SOURCE_ID,
        paint: {
          'circle-color': venueAccent,
          'circle-radius': 4,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      });
    } else {
      instance.setPaintProperty('city-circles', 'circle-radius', radius as never);
      instance.setPaintProperty('city-circles', 'circle-color', accent);
    }

    // Hover readout. A circle whose size is its only encoding is unreadable
    // without the number — the dataviz rule that a mark carrying a value ships
    // a way to read that value exactly.
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
    });

    const onEnter = (event: MapLayerMouseEvent): void => {
      const feature = event.features?.[0];
      if (!feature) return;
      const props = feature.properties as { display?: string; count?: number };
      instance.getCanvas().style.cursor = 'pointer';
      popup
        .setLngLat(event.lngLat)
        .setText(
          `${props.display ?? ''} — ${props.count ?? 0} ${GEOGRAPHY_MEASURE_LABEL[measure].toLowerCase()}`,
        )
        .addTo(instance);
    };
    const onLeave = (): void => {
      instance.getCanvas().style.cursor = '';
      popup.remove();
    };

    instance.on('mousemove', 'city-circles', onEnter);
    instance.on('mouseleave', 'city-circles', onLeave);

    return () => {
      instance.off('mousemove', 'city-circles', onEnter);
      instance.off('mouseleave', 'city-circles', onLeave);
      popup.remove();
    };
  }, [ready, cities, venuePins, measure, accent, venueAccent]);

  return (
    // ⚠️ `relative` is load-bearing, not spacing. MapLibre positions its canvas
    // absolutely; without a positioned ancestor it anchors to the viewport and
    // paints at the top of the page. The stylesheet (globals.css) sets this on
    // `.maplibregl-map` too — this is the belt to that braces, because the
    // symptom is bizarre enough to cost an hour to recognise.
    <div className="relative" style={{ height }}>
      <div
        ref={container}
        className="h-full w-full overflow-hidden rounded-md border"
        // The canvas carries no text, so the figure is named for a screen reader
        // and the table below is the real accessible route to the same data.
        role="img"
        aria-label={`Map of ${GEOGRAPHY_MEASURE_LABEL[measure].toLowerCase()} by city. The table below lists the same figures.`}
      />
      {failed && (
        // An OVERLAY, never a replacement: the container above must stay
        // mounted for the whole life of this component, because a live MapLibre
        // instance is holding it.
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-card p-6 text-center">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            The map could not be drawn.
          </p>
          <p className="max-w-prose text-xs text-muted-foreground">
            The basemap tiles or the browser&apos;s WebGL context were unavailable.
            This says nothing about where your users are — the city table and the
            roll-ups below are unaffected and remain the complete answer.
          </p>
        </div>
      )}
    </div>
  );
}
