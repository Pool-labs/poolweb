/**
 * The self-hosted Protomaps basemap the admin Geography map reads (poolweb#33).
 *
 * ⚠️ COMMITTED ON PURPOSE, AND IT IS NOT A SECRET. It is a CloudFront
 * distribution in front of public OSM-derived reference data — poolmobile's
 * `eas.json` commits this same URL in all four build profiles, and the browser
 * fetches the archive directly by HTTP range request with no credential of any
 * kind. What would be wrong is the opposite: leaving it to a per-environment
 * env var means the map ships DARK until somebody remembers an ops step, which
 * is the exact "shipped it, nothing happened" shape this repo keeps hitting.
 *
 * Still overridable — set `NEXT_PUBLIC_MAP_TILES_BASE_URL` to point a
 * deployment somewhere else, or to the empty string to turn the map off (the
 * panel then says the origin is unconfigured rather than rendering broken).
 */
const DEFAULT_MAP_TILES_BASE_URL = 'https://dqn7ilu6qcm2q.cloudfront.net'

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MAP_TILES_BASE_URL:
      process.env.NEXT_PUBLIC_MAP_TILES_BASE_URL ?? DEFAULT_MAP_TILES_BASE_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
