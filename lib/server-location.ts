import type { NextRequest } from "next/server"

// Reads Vercel's edge-set geolocation headers, which describe the original
// client (not the serverless function's own IP). Returns null when the
// headers are absent (local dev or non-Vercel host) so the caller can fall
// back to the client-supplied location.
export function getLocationFromVercelHeaders(request: NextRequest): string | null {
  const countryCode = request.headers.get("x-vercel-ip-country")
  if (!countryCode) return null

  const regionCode = request.headers.get("x-vercel-ip-country-region")
  const rawCity = request.headers.get("x-vercel-ip-city")
  const city = rawCity ? decodeURIComponent(rawCity) : ""

  let country = countryCode
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode)
    if (name) country = name
  } catch {}

  return [city, regionCode, country].filter(Boolean).join(", ")
}
