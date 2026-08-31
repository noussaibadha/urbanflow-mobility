const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// router.project-osrm.org (the single public OSRM demo) only ever serves its
// "driving" graph no matter which profile is requested in the URL, so every
// mode used to come back with the exact same route. FOSSGIS (the German OSM
// chapter) hosts separate car/bike/foot OSRM instances with real distinct
// routing graphs, so each mode actually produces a different path.
const OSRM_ROUTING_BY_MODE = {
  car: { base: 'https://routing.openstreetmap.de/routed-car', profile: 'driving' },
  bike: { base: 'https://routing.openstreetmap.de/routed-bike', profile: 'bike' },
  scooter: { base: 'https://routing.openstreetmap.de/routed-bike', profile: 'bike' },
  walk: { base: 'https://routing.openstreetmap.de/routed-foot', profile: 'foot' },
  public_transport: { base: 'https://routing.openstreetmap.de/routed-foot', profile: 'foot' },
}

// Average urban speeds (m/s), used to estimate duration for modes whose
// routing graph doesn't model them distinctly: scooter reuses the bike graph
// and métro reuses the foot graph as a path approximation, so their real-world
// average speed has to be substituted for the graph's own duration estimate.
const AVERAGE_SPEED_MS = {
  scooter: 5.5, // ~20 km/h
  public_transport: 6.9, // ~25 km/h average incl. station stops
}

// Grams of CO2 per km travelled, used to estimate emissions and savings vs
// car (rough ADEME-style approximations).
const CO2_G_PER_KM = {
  car: 120,
  public_transport: 4, // métro/RER
  scooter: 0,
  bike: 0,
  walk: 0,
}

export async function geocode(query) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error("Le service de géocodage n'a pas répondu")

  const results = await res.json()
  if (results.length === 0) {
    throw new Error(`Adresse introuvable : "${query}"`)
  }

  const { lat, lon, display_name } = results[0]
  return { lat: parseFloat(lat), lon: parseFloat(lon), label: display_name }
}

export async function searchAddresses(query, limit = 5) {
  if (!query || query.trim().length < 3) return []

  const url = `${NOMINATIM_URL}?format=json&limit=${limit}&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []

  const results = await res.json()
  return results.map((r) => ({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), label: r.display_name }))
}

export async function getRoute({ start, end, mode }) {
  const routing = OSRM_ROUTING_BY_MODE[mode] || OSRM_ROUTING_BY_MODE.car
  const coords = `${start.lon},${start.lat};${end.lon},${end.lat}`
  const url = `${routing.base}/route/v1/${routing.profile}/${coords}?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) throw new Error("Le service d'itinéraire n'a pas répondu")

  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error("Aucun itinéraire trouvé entre ces deux points")
  }

  const route = data.routes[0]
  const path = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
  const speed = AVERAGE_SPEED_MS[mode]
  const durationSeconds = speed ? route.distance / speed : route.duration

  const distanceKm = route.distance / 1000
  const co2Factor = CO2_G_PER_KM[mode] ?? CO2_G_PER_KM.car
  const co2Grams = Math.round(distanceKm * co2Factor)
  const co2SavedGrams = Math.round(Math.max(0, distanceKm * (CO2_G_PER_KM.car - co2Factor)))

  return {
    path,
    distanceMeters: route.distance,
    durationSeconds,
    co2Grams,
    co2SavedGrams,
  }
}

export function watchPosition({ onUpdate, onError }) {
  if (!('geolocation' in navigator)) {
    onError(new Error("La géolocalisation n'est pas disponible sur cet appareil"))
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      })
    },
    (err) => onError(new Error(err.message)),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  )

  return () => navigator.geolocation.clearWatch(watchId)
}
