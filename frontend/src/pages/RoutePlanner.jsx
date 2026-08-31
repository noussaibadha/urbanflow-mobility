import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RouteMap } from '../components/RouteMap'
import { TransportPicker } from '../components/TransportPicker'
import { AddressAutocomplete } from '../components/AddressAutocomplete'
import { geocode, getRoute, watchPosition } from '../lib/geo'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PLANNER_MODE_OPTIONS, TRANSPORT_MODE_META, ROUTE_TYPE_META } from '../lib/transportModes'

const SHARED_MOBILITY_REFRESH_MS = 60_000

// Modes tried for the "other options" list, in priority order — the
// currently selected mode is always included first, then this list is used
// to fill up to 4 total. Scooter is de-prioritized since its route is
// identical to bike's (same OSRM profile), just faster.
const ALTERNATIVE_MODE_ORDER = ['public_transport', 'bike', 'walk', 'car', 'scooter']
const MAX_ALTERNATIVES = 4

function pickAlternativeModes(selectedMode) {
  const modes = [selectedMode, ...ALTERNATIVE_MODE_ORDER.filter((m) => m !== selectedMode)]
  return modes.slice(0, MAX_ALTERNATIVES)
}

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function formatTime(date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatCO2(grams) {
  if (grams <= 0) return '0 g CO₂'
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg CO₂`
  return `${grams} g CO₂`
}

export function RoutePlanner() {
  const { user } = useAuth()
  const location = useLocation()

  const [livePosition, setLivePosition] = useState(null)
  const [geoError, setGeoError] = useState(null)

  const [useLiveLocation, setUseLiveLocation] = useState(true)
  const [departureText, setDepartureText] = useState('')
  const [destinationText, setDestinationText] = useState('')
  // Set when the user picks a suggestion from the address autocomplete, so we
  // can reuse its lat/lon directly instead of re-geocoding the full Nominatim
  // display_name (which is often too verbose for Nominatim to match again).
  // Cleared whenever the text is edited by hand so it never goes stale.
  const [departurePoint, setDeparturePoint] = useState(null)
  const [destinationPoint, setDestinationPoint] = useState(null)
  const [mode, setMode] = useState('bike')

  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [departureTime, setDepartureTime] = useState(null)
  const [routeResult, setRouteResult] = useState(null)
  // One entry per successfully computed mode from the last "Calculer" click —
  // powers the alternatives list. The currently displayed routeResult/
  // metroJourney always mirrors whichever entry matches `mode`.
  const [alternatives, setAlternatives] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [sharedStations, setSharedStations] = useState([])
  const [transitStops, setTransitStops] = useState([])
  const [showSharedMobility, setShowSharedMobility] = useState(true)
  const [showTransitStops, setShowTransitStops] = useState(true)

  const [tripConfirmed, setTripConfirmed] = useState(false)
  const [confirmingTrip, setConfirmingTrip] = useState(false)

  const [metroJourney, setMetroJourney] = useState(null)

  useEffect(() => {
    const stop = watchPosition({ onUpdate: setLivePosition, onError: setGeoError })
    return stop
  }, [])

  useEffect(() => {
    const prefillTo = location.state?.prefillTo
    const prefillMode = location.state?.prefillMode
    const prefillPoint = location.state?.prefillPoint
    if (prefillTo) setDestinationText(prefillTo)
    if (prefillPoint?.lat != null && prefillPoint?.lon != null) setDestinationPoint(prefillPoint)
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

  function selectAlternative(selectedMode, list) {
    const entry = list.find((a) => a.mode === selectedMode) || list[0]
    if (!entry) return
    setMode(entry.mode)
    setRouteResult(entry.result)
    setMetroJourney(entry.journey || null)
  }

  async function computeRouteForMode(startPoint, endPoint, m) {
    const result = await getRoute({ start: startPoint, end: endPoint, mode: m })
    let journey = null
    if (m === 'public_transport') {
      journey = await apiRequest(
        `/transit/journey?fromLat=${startPoint.lat}&fromLon=${startPoint.lon}&toLat=${endPoint.lat}&toLon=${endPoint.lon}`
      ).catch(() => ({ found: false }))
    }
    return { mode: m, result, journey }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setRouteResult(null)
    setAlternatives([])
    setTripConfirmed(false)
    setMetroJourney(null)

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
        : departurePoint || (await geocode(departureText))

      const endPoint = destinationPoint || (await geocode(destinationText))

      setStart(startPoint)
      setEnd(endPoint)
      setDepartureTime(new Date())

      const modesToTry = pickAlternativeModes(mode)
      const computed = await Promise.all(
        modesToTry.map((m) =>
          computeRouteForMode(startPoint, endPoint, m).catch((err) => ({ mode: m, error: err.message }))
        )
      )

      const successes = computed.filter((c) => c.result)
      if (successes.length === 0) {
        setError(computed[0]?.error || 'Aucun itinéraire trouvé entre ces deux points.')
        return
      }

      setAlternatives(successes)
      selectAlternative(mode, successes)
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

  const modeMeta = TRANSPORT_MODE_META[mode] ?? { label: mode, color: '#52B788', emoji: '📍' }

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
              <AddressAutocomplete
                value={departureText}
                onChange={(text) => {
                  setDepartureText(text)
                  setDeparturePoint(null)
                }}
                onSelect={setDeparturePoint}
                placeholder="Départ"
                required={!useLiveLocation}
              />
            </div>
          )}

          <div className="planner-field">
            <span className="dot" style={{ background: '#B7E4C7' }} />
            <AddressAutocomplete
              value={destinationText}
              onChange={(text) => {
                setDestinationText(text)
                setDestinationPoint(null)
              }}
              onSelect={setDestinationPoint}
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
          <div className="route-result-card">
            <div className="route-result-mode">
              <span className="route-result-mode-badge" style={{ background: modeMeta.color }}>
                {modeMeta.emoji}
              </span>
              <span className="route-result-mode-label">{modeMeta.label}</span>
            </div>

            <div className="route-result-stats">
              <div className="route-result-stat">
                <span className="route-result-stat-value">{formatDuration(routeResult.durationSeconds)}</span>
                <span className="route-result-stat-label">Durée</span>
              </div>
              <div className="route-result-stat">
                <span className="route-result-stat-value">{formatDistance(routeResult.distanceMeters)}</span>
                <span className="route-result-stat-label">Distance</span>
              </div>
              <div className="route-result-stat">
                <span className="route-result-stat-value">{formatCO2(routeResult.co2Grams)}</span>
                <span className="route-result-stat-label">Émis</span>
              </div>
            </div>

            <div className="route-result-footer">
              <span>
                Arrivée estimée à{' '}
                {formatTime(new Date(departureTime.getTime() + routeResult.durationSeconds * 1000))}
              </span>
              {routeResult.co2SavedGrams > 0 && (
                <span>· {formatCO2(routeResult.co2SavedGrams)} économisés vs voiture</span>
              )}
            </div>
          </div>

          {alternatives.length > 1 && (
            <>
              <div className="card-heading">Autres options</div>
              <div className="route-alt-list">
                {alternatives.map((alt) => {
                  const altMeta = TRANSPORT_MODE_META[alt.mode] ?? { label: alt.mode, color: '#52B788', emoji: '📍' }
                  const arrival = new Date(departureTime.getTime() + alt.result.durationSeconds * 1000)
                  const legs =
                    alt.mode === 'public_transport' && alt.journey?.found && !alt.journey.sameStation
                      ? alt.journey.legs
                      : []

                  return (
                    <button
                      type="button"
                      key={alt.mode}
                      className={`route-alt-card${alt.mode === mode ? ' active' : ''}`}
                      onClick={() => selectAlternative(alt.mode, alternatives)}
                    >
                      <div className="route-alt-times">
                        <span>
                          {formatTime(departureTime)} → {formatTime(arrival)}
                        </span>
                        <span className="route-alt-duration">{formatDuration(alt.result.durationSeconds)}</span>
                      </div>
                      <div className="route-alt-preview">
                        {legs.length > 0 ? (
                          <>
                            <span>🚶</span>
                            {legs.map((leg, i) => (
                              <span key={i} className="route-alt-line-badge" style={{ background: `#${leg.color}` }}>
                                {leg.shortName}
                              </span>
                            ))}
                            <span>🚶</span>
                          </>
                        ) : (
                          <span className="route-alt-mode-emoji">{altMeta.emoji}</span>
                        )}
                        <span className="route-alt-mode-label">{altMeta.label}</span>
                      </div>
                      <div className="route-alt-co2">{formatCO2(alt.result.co2Grams)}</div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {mode === 'public_transport' && (
            <>
              <div className="card-heading">Trajet en transports en commun</div>
              <div className="white-card metro-journey-card">
                {metroJourney?.found && (
                  <>
                    <div className="metro-journey-step">
                      <span className="metro-journey-walk">🚶 {formatDistance(metroJourney.fromStation.walkMeters)}</span>
                      <span>
                        jusqu'à <strong>{metroJourney.fromStation.name}</strong>
                      </span>
                    </div>

                    {metroJourney.sameStation ? (
                      <div className="metro-journey-step">
                        <span>Départ et arrivée à la même station.</span>
                      </div>
                    ) : metroJourney.legs.length > 0 ? (
                      metroJourney.legs.map((leg, i) => {
                        const typeMeta = ROUTE_TYPE_META[leg.type]
                        return (
                          <div className="metro-journey-step" key={i}>
                            <span className="metro-line-badge" style={{ background: `#${leg.color}` }}>
                              {typeMeta ? `${typeMeta.emoji} ` : ''}
                              {leg.shortName}
                            </span>
                            <span>
                              {i > 0 && <>correspondance · </>}
                              {typeMeta ? <>{typeMeta.label} </> : null}
                              {leg.headsign ? (
                                <>
                                  direction <strong>{leg.headsign}</strong>,{' '}
                                </>
                              ) : null}
                              station <strong>{leg.board}</strong> → <strong>{leg.alight}</strong>
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="metro-journey-step">
                        <span>Aucune ligne directe ou correspondance trouvée entre ces deux stations.</span>
                      </div>
                    )}

                    <div className="metro-journey-step">
                      <span className="metro-journey-walk">🚶 {formatDistance(metroJourney.toStation.walkMeters)}</span>
                      <span>jusqu'à votre destination</span>
                    </div>
                  </>
                )}

                {metroJourney && !metroJourney.found && (
                  <p className="empty-state">Aucune donnée de ligne disponible pour ce trajet.</p>
                )}
              </div>
            </>
          )}

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
