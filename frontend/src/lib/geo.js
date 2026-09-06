import { useEffect, useState } from 'react'
import { useLocationConsent } from './locationConsent'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// Le serveur OSRM public renvoie toujours l'itinéraire voiture peu importe le
// mode demandé. FOSSGIS a des serveurs séparés par mode (vélo/voiture/pied),
// donc chaque mode a un vrai itinéraire différent.
const OSRM_ROUTING_BY_MODE = {
  car: { base: 'https://routing.openstreetmap.de/routed-car', profile: 'driving' },
  bike: { base: 'https://routing.openstreetmap.de/routed-bike', profile: 'bike' },
  walk: { base: 'https://routing.openstreetmap.de/routed-foot', profile: 'foot' },
  public_transport: { base: 'https://routing.openstreetmap.de/routed-foot', profile: 'foot' },
}

// Vitesses moyennes en ville (m/s) pour estimer la durée des modes dont le
// graphe de routing donne pas de durée fiable. Le transport en commun est pas
// dans ce tableau, sa durée vient du vrai trajet GTFS
// (estimateTransitDurationSeconds plus bas).
const AVERAGE_SPEED_MS = {}

// Les horaires GTFS réels sont pas chargés, donc on estime la durée avec le
// nombre de stations et de correspondances.
const TRANSIT_SECONDS_PER_STATION = 120 // ~2 min running time between stations
const TRANSIT_WAIT_SECONDS = 210 // ~3.5 min average wait per boarding (3-4 min range)
const WALK_SPEED_MS = 1.3 // ~4.7 km/h, average adult walking pace

// Grammes de CO2 par km, pour estimer les émissions et les économies par
// rapport à la voiture (valeurs approx type ADEME).
const CO2_G_PER_KM = {
  car: 120,
  public_transport: 4, // métro/RER
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

// journey vient de la réponse /api/transit/journey : marche jusqu'à la
// première station, chaque trajet en transport, puis marche jusqu'à
// l'arrivée.
export function estimateTransitDurationSeconds(journey) {
  if (!journey?.found) return null

  const walkSeconds = (journey.fromStation.walkMeters + journey.toStation.walkMeters) / WALK_SPEED_MS
  if (journey.sameStation) return walkSeconds

  const legs = journey.legs || []
  if (legs.length === 0) return walkSeconds

  const ridingSeconds = legs.reduce((sum, leg) => sum + (leg.stopsCount ?? 1) * TRANSIT_SECONDS_PER_STATION, 0)
  const waitSeconds = legs.length * TRANSIT_WAIT_SECONDS

  return walkSeconds + ridingSeconds + waitSeconds
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

// La géolocalisation doit jamais démarrer toute seule. Le navigateur demande
// la permission, mais ça doit être déclenché par une action de l'utilisateur
// (case à cocher/bouton), pas au chargement de la page.
export function useOptInLocation(enabled) {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setPosition(null)
      setError(null)
      return
    }
    return watchPosition({ onUpdate: setPosition, onError: setError })
  }, [enabled])

  return { position, error }
}

// Barrière de consentement RGPD avant la géolocalisation : on demande jamais
// la position tant que l'utilisateur a pas dit oui une fois (choix gardé en
// mémoire pour pas redemander à chaque visite).
export function useConsentedLocation() {
  const [consent, setConsent] = useLocationConsent()
  const [wantsLocation, setWantsLocation] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  const { position, error } = useOptInLocation(wantsLocation && consent === 'granted')

  function requestLocation() {
    if (consent === 'granted') {
      setWantsLocation(true)
    } else if (consent === 'denied') {
      setWantsLocation(false)
    } else {
      setShowPrompt(true)
    }
  }

  function respondConsent(granted) {
    setConsent(granted ? 'granted' : 'denied')
    setShowPrompt(false)
    setWantsLocation(granted)
  }

  function disable() {
    setWantsLocation(false)
  }

  return {
    position,
    error,
    consent,
    active: wantsLocation && consent === 'granted',
    showPrompt,
    requestLocation,
    respondConsent,
    disable,
  }
}
