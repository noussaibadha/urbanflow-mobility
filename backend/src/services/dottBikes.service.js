// Dott GBFS feed (transport.data.gouv.fr) — public, free, no API key.
// Dott only operates bikes in Paris: free-floating scooters have been banned
// intra-muros since September 2023, so despite the endpoint name
// ("free_bike_status"), every vehicle this feed lists is a bike.
// https://gbfs.api.ridedott.com/public/v2/paris/free_bike_status.json
const FREE_BIKE_STATUS_URL = 'https://gbfs.api.ridedott.com/public/v2/paris/free_bike_status.json'

const CACHE_TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 8_000

let cache = { bikes: null, fetchedAt: 0 }

export class DottUnavailableError extends Error {}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Dott GBFS request failed with status ${res.status}`)
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new DottUnavailableError(`Dott GBFS request to ${url} timed out after ${timeoutMs}ms`)
    }
    throw new DottUnavailableError(err.message)
  } finally {
    clearTimeout(timer)
  }
}

// Free-floating vehicles only report a live position, no station — unlike
// Vélib (see sharedMobility.service.js), so "availability" is just "does the
// cached feed list a bike here right now that's neither reserved nor disabled".
export async function getAvailableBikes({ forceRefresh = false } = {}) {
  const isFresh = Date.now() - cache.fetchedAt < CACHE_TTL_MS
  if (cache.bikes && isFresh && !forceRefresh) {
    return cache.bikes
  }

  let json
  try {
    json = await fetchJsonWithTimeout(FREE_BIKE_STATUS_URL, FETCH_TIMEOUT_MS)
  } catch (err) {
    // Keep serving the last known-good list if Dott is having a bad moment —
    // only bubble up if we've never managed to fetch anything at all. This is
    // what protects a live demo from one slow/flaky upstream response.
    if (cache.bikes) {
      console.error(`[dottBikes] Refresh failed, serving stale cache: ${err.message}`)
      return cache.bikes
    }
    throw err
  }

  const bikes = (json.data?.bikes || [])
    .filter((b) => !b.is_reserved && !b.is_disabled && Number.isFinite(b.lat) && Number.isFinite(b.lon))
    .map((b) => ({ id: b.bike_id, lat: b.lat, lon: b.lon }))

  cache = { bikes, fetchedAt: Date.now() }
  return bikes
}
