const STATION_INFO_URL =
  'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_information.json'
const STATION_STATUS_URL =
  'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_status.json'

const CACHE_TTL_MS = 60_000

let cache = { data: null, fetchedAt: 0 }

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GBFS request to ${url} failed with status ${res.status}`)
  return res.json()
}

function bikesByType(entry) {
  const breakdown = { mechanical: 0, ebike: 0 }
  for (const item of entry.num_bikes_available_types || []) {
    if (typeof item.mechanical === 'number') breakdown.mechanical = item.mechanical
    if (typeof item.ebike === 'number') breakdown.ebike = item.ebike
  }
  return breakdown
}

export async function getSharedMobilityStations({ forceRefresh = false } = {}) {
  const isFresh = Date.now() - cache.fetchedAt < CACHE_TTL_MS
  if (cache.data && isFresh && !forceRefresh) {
    return cache.data
  }

  const [infoRes, statusRes] = await Promise.all([
    fetchJson(STATION_INFO_URL),
    fetchJson(STATION_STATUS_URL),
  ])

  const statusByStationId = new Map(statusRes.data.stations.map((s) => [s.station_id, s]))

  const stations = infoRes.data.stations.map((info) => {
    const status = statusByStationId.get(info.station_id)
    const bikes = status ? bikesByType(status) : { mechanical: 0, ebike: 0 }

    return {
      id: info.station_id,
      name: info.name,
      lat: info.lat,
      lon: info.lon,
      capacity: info.capacity,
      bikesAvailable: status?.num_bikes_available ?? 0,
      mechanicalAvailable: bikes.mechanical,
      ebikeAvailable: bikes.ebike,
      docksAvailable: status?.num_docks_available ?? 0,
      isRenting: status?.is_renting === 1,
    }
  })

  cache = { data: { provider: 'velib-metropole', stations }, fetchedAt: Date.now() }
  return cache.data
}
