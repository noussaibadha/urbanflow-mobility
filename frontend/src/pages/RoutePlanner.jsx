import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RouteMap } from '../components/RouteMap'
import { TransportPicker } from '../components/TransportPicker'
import { geocode, getRoute, watchPosition } from '../lib/geo'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PLANNER_MODE_OPTIONS } from '../lib/transportModes'

const SHARED_MOBILITY_REFRESH_MS = 60_000

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

export function RoutePlanner() {
  const { user } = useAuth()
  const location = useLocation()

  const [livePosition, setLivePosition] = useState(null)
  const [geoError, setGeoError] = useState(null)

  const [useLiveLocation, setUseLiveLocation] = useState(true)
  const [departureText, setDepartureText] = useState('')
  const [destinationText, setDestinationText] = useState('')
  const [mode, setMode] = useState('bike')

  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [routeResult, setRouteResult] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [sharedStations, setSharedStations] = useState([])
  const [transitStops, setTransitStops] = useState([])
  const [showSharedMobility, setShowSharedMobility] = useState(true)
  const [showTransitStops, setShowTransitStops] = useState(true)

  const [tripConfirmed, setTripConfirmed] = useState(false)
  const [confirmingTrip, setConfirmingTrip] = useState(false)

  useEffect(() => {
    const stop = watchPosition({ onUpdate: setLivePosition, onError: setGeoError })
    return stop
  }, [])

  useEffect(() => {
    const prefillTo = location.state?.prefillTo
    const prefillMode = location.state?.prefillMode
    if (prefillTo) setDestinationText(prefillTo)
    if (prefillMode) setMode(prefillMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    apiRequest('/transit/stops')
      .then((data) => setTransitStops(data.stops))
      .catch(() => setTransitStops([]))
  }, [])

  useEffect(() => {
    function loadSharedStations() {
      apiRequest('/shared-mobility/stations')
        .then((data) => setSharedStations(data.stations))
        .catch(() => setSharedStations([]))
    }

    loadSharedStations()
    const interval = setInterval(loadSharedStations, SHARED_MOBILITY_REFRESH_MS)
    return () => clearInterval(interval)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setRouteResult(null)
    setTripConfirmed(false)

    if (useLiveLocation && !livePosition) {
      setError('Position en temps réel indisponible. Autorisez la géolocalisation ou saisissez un départ.')
      return
    }
    if (!destinationText.trim()) {
      setError('Veuillez saisir une destination.')
      return
    }

    setLoading(true)
    try {
      const startPoint = useLiveLocation
        ? { ...livePosition, label: 'Ma position' }
        : await geocode(departureText)

      const endPoint = await geocode(destinationText)

      const result = await getRoute({ start: startPoint, end: endPoint, mode })

      setStart(startPoint)
      setEnd(endPoint)
      setRouteResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmTrip() {
    if (!routeResult) return
    setConfirmingTrip(true)
    setError(null)
    try {
      await apiRequest('/trips', {
        method: 'POST',
        auth: true,
        body: {
          mode,
          distance_meters: routeResult.distanceMeters,
          duration_seconds: routeResult.durationSeconds,
          from_label: start?.label,
          to_label: end?.label,
        },
      })
      setTripConfirmed(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmingTrip(false)
    }
  }

  return (
    <div className="planner-page">
      <div className="planner-header-card">
        <h1>Itinéraire</h1>

        <form onSubmit={handleSubmit}>
          <label className="planner-checkbox-label">
            <input
              type="checkbox"
              checked={useLiveLocation}
              onChange={(e) => setUseLiveLocation(e.target.checked)}
            />
            Utiliser ma position actuelle comme départ
          </label>

          {!useLiveLocation && (
            <div className="planner-field">
              <span className="dot" style={{ background: '#52B788' }} />
              <input
                value={departureText}
                onChange={(e) => setDepartureText(e.target.value)}
                placeholder="Départ"
                required={!useLiveLocation}
              />
            </div>
          )}

          <div className="planner-field">
            <span className="dot" style={{ background: '#B7E4C7' }} />
            <input
              value={destinationText}
              onChange={(e) => setDestinationText(e.target.value)}
              placeholder="Destination"
              required
            />
          </div>

          <TransportPicker
            options={PLANNER_MODE_OPTIONS}
            value={mode}
            onChange={setMode}
            gridClassName="planner-mode-grid"
            itemClassName="planner-mode-pill"
          />

          {geoError && useLiveLocation && <p className="form-error">{geoError.message}</p>}
          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Calcul en cours...' : 'Calculer'}
          </button>
        </form>
      </div>

      {routeResult && (
        <>
          <div className="route-summary">
            <span>Distance : {formatDistance(routeResult.distanceMeters)}</span>
            <span>Durée estimée : {formatDuration(routeResult.durationSeconds)}</span>
          </div>

          {user && (
            <button
              type="button"
              className="confirm-trip-btn"
              onClick={handleConfirmTrip}
              disabled={confirmingTrip || tripConfirmed}
            >
              {tripConfirmed ? 'Trajet enregistré ✓' : confirmingTrip ? 'Enregistrement...' : 'Confirmer ce trajet'}
            </button>
          )}
        </>
      )}

      <div className="map-layer-toggles">
        <label>
          <input
            type="checkbox"
            checked={showSharedMobility}
            onChange={(e) => setShowSharedMobility(e.target.checked)}
          />
          🚲 Vélos/trottinettes partagés ({sharedStations.length})
        </label>
        <label>
          <input
            type="checkbox"
            checked={showTransitStops}
            onChange={(e) => setShowTransitStops(e.target.checked)}
          />
          🚌 Transports en commun ({transitStops.length})
        </label>
      </div>

      <RouteMap
        livePosition={livePosition}
        start={start}
        end={end}
        path={routeResult?.path}
        sharedStations={showSharedMobility ? sharedStations : []}
        transitStops={showTransitStops ? transitStops : []}
      />
    </div>
  )
}
