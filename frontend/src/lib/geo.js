const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const OSRM_URL = 'https://router.project-osrm.org/route/v1'

const OSRM_PROFILE_BY_MODE = {
  walk: 'walking',
  bike: 'cycling',
  scooter: 'cycling',
  car: 'driving',
}

// Average urban speeds (m/s), used to estimate duration for modes the public
// OSRM demo server does not actually model separately from driving.
const AVERAGE_SPEED_MS = {
  walk: 1.4, // ~5 km/h
  bike: 4.2, // ~15 km/h
  scooter: 5.5, // ~20 km/h
  car: 11.1, // ~40 km/h
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

export async function getRoute({ start, end, mode }) {
  const profile = OSRM_PROFILE_BY_MODE[mode] || 'driving'
  const coords = `${start.lon},${start.lat};${end.lon},${end.lat}`
  const url = `${OSRM_URL}/${profile}/${coords}?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) throw new Error("Le service d'itinéraire n'a pas répondu")

  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error("Aucun itinéraire trouvé entre ces deux points")
  }

  const route = data.routes[0]
  const path = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
  const speed = AVERAGE_SPEED_MS[mode] || AVERAGE_SPEED_MS.car
  const durationSeconds = mode === 'car' ? route.duration : route.distance / speed

  return {
    path,
    distanceMeters: route.distance,
    durationSeconds,
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
