import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RouteMap } from '../components/RouteMap'
import { TransportPicker } from '../components/TransportPicker'
import { AddressAutocomplete } from '../components/AddressAutocomplete'
import { geocode, getRoute, useConsentedLocation, estimateTransitDurationSeconds } from '../lib/geo'
import { LocationConsentModal } from '../components/LocationConsentModal'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PLANNER_MODE_OPTIONS, TRANSPORT_MODE_META, ROUTE_TYPE_META } from '../lib/transportModes'
import { scoreCandidates } from '../utils/routeModel'

const SHARED_MOBILITY_REFRESH_MS = 60_000

// Modes tried for the "other options" list, in priority order — the
// currently selected mode is always included first, then this list is used
// to fill up to 4 total.
const ALTERNATIVE_MODE_ORDER = ['public_transport', 'bike', 'walk', 'car']
const MAX_ALTERNATIVES = 4

function pickAlternativeModes(selectedMode) {
  const modes = [selectedMode, ...ALTERNATIVE_MODE_ORDER.filter((m) => m !== selectedMode)]
  return modes.slice(0, MAX_ALTERNATIVES)
}

// Doesn't change what the planner computes or compares — only picks which of
// the already-computed `successes` to highlight, based on the user's saved
// profile.route_priority (see Profile.jsx) and the learned weights in
// utils/routeModel.js. Returns null when there's no saved preference (logged
// out, or never set), matching the pre-recommendation behavior.
function pickRecommendedMode(successes, priority) {
  if (!priority || successes.length === 0) return null

  const candidates = successes.map((c) => ({
    mode: c.mode,
    duration: c.result.durationSeconds / 60,
    co2: c.result.co2Grams,
  }))

  const scored = scoreCandidates(candidates, priority)
  if (scored.some((c) => c.score == null)) return null

  return scored.reduce((best, c) => (c.score > best.score ? c : best)).mode
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

  const {
    position: livePosition,
    error: geoError,
    consent: locationConsent,
    active: useLiveLocation,
    showPrompt: showLocationConsent,
    requestLocation,
    respondConsent,
    disable: disableLocation,
  } = useConsentedLocation()
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
  const [dottBikeInfo, setDottBikeInfo] = useState(null)
  const [routePriority, setRoutePriority] = useState(null)
  const [recommendedMode, setRecommendedMode] = useState(null)

  useEffect(() => {
    if (!user) {
      setRoutePriority(null)
      return
    }
    apiRequest('/profile', { auth: true })
      .then((data) => setRoutePriority(data.profile?.route_priority ?? null))
      .catch(() => setRoutePriority(null))
  }, [user])

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
    setDottBikeInfo(entry.dottBike || null)
  }

  async function computeRouteForMode(startPoint, endPoint, m) {
    // Routing itself is unchanged for every mode, bike included — a real
    // Dott bike being absent nearby never blocks or alters the route, it
    // only adds informational detail below when one is found.
    const result = await getRoute({ start: startPoint, end: endPoint, mode: m })
    let journey = null
    let dottBike = null

    if (m === 'public_transport') {
      journey = await apiRequest(
        `/transit/journey?fromLat=${startPoint.lat}&fromLon=${startPoint.lon}&toLat=${endPoint.lat}&toLon=${endPoint.lon}`
      ).catch((err) => ({ found: false, reason: 'request_failed', message: err.message }))

      if (!journey.found) {
        console.error(
          `[transit/journey] No public transport journey (reason: ${journey.reason}) for ` +
            `(${startPoint.lat},${startPoint.lon}) -> (${endPoint.lat},${endPoint.lon}).`,
          journey
        )
      } else {
        // The OSRM foot-profile "route" above is only used for the map path/
        // distance here — its distance/25km/h duration guess badly
        // undercounts a real transit trip (no station stops, no wait time).
        const estimated = estimateTransitDurationSeconds(journey)
        if (estimated != null) result.durationSeconds = estimated
      }
    }

    if (m === 'bike') {
      dottBike = await apiRequest(
        `/shared-mobility/dott-bikes/nearest?lat=${startPoint.lat}&lon=${startPoint.lon}`
      ).catch((err) => ({ found: false, reason: 'request_failed', message: err.message }))
    }

    return { mode: m, result, journey, dottBike }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setRouteResult(null)
    setAlternatives([])
    setTripConfirmed(false)
    setMetroJourney(null)
    setDottBikeInfo(null)
    setRecommendedMode(null)

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

      // The mode the user actually picked may have failed even though other
      // alternatives succeeded — surface that explicitly instead of silently
      // switching them to a different mode.
      const selectedFailure = computed.find((c) => c.mode === mode && c.error)
      if (selectedFailure) setError(selectedFailure.error)

      setAlternatives(successes)
      setRecommendedMode(pickRecommendedMode(successes, routePriority))
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
              onChange={(e) => (e.target.checked ? requestLocation() : disableLocation())}
            />
            Utiliser ma position actuelle comme départ
          </label>

          {locationConsent === 'denied' && (
            <p className="planner-note">
              Géolocalisation refusée — modifiable depuis votre profil.
            </p>
          )}

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
                ariaLabel="Adresse de départ"
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
              ariaLabel="Adresse de destination"
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

      {showLocationConsent && (
        <LocationConsentModal onAllow={() => respondConsent(true)} onDeny={() => respondConsent(false)} />
      )}

      {routeResult && (
        <>
          <div className="route-result-card">
            <div className="route-result-mode">
              <span className="route-result-mode-badge" style={{ background: modeMeta.color }}>
                {modeMeta.emoji}
              </span>
              <span className="route-result-mode-label">{modeMeta.label}</span>
              {mode === recommendedMode && <span className="recommended-badge">Recommandé</span>}
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

            {mode === 'bike' && dottBikeInfo?.found && (
              <p className="dott-bike-note">
                🚲 Vélo Dott réel disponible à {formatDistance(dottBikeInfo.walkMeters)} de votre départ
              </p>
            )}
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
                      {alt.mode === recommendedMode && (
                        <span className="recommended-badge recommended-badge-alt">Recommandé</span>
                      )}
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
                        <span>Aucun trajet en transports en commun trouvé pour ce parcours.</span>
                      </div>
                    )}

                    <div className="metro-journey-step">
                      <span className="metro-journey-walk">🚶 {formatDistance(metroJourney.toStation.walkMeters)}</span>
                      <span>jusqu'à votre destination</span>
                    </div>
                  </>
                )}

                {metroJourney && !metroJourney.found && (
                  <p className="empty-state">
                    {metroJourney.reason === 'no_transit_data'
                      ? "Aucune donnée de ligne de transport en commun n'est chargée sur ce serveur pour l'instant."
                      : metroJourney.reason === 'out_of_coverage'
                        ? 'Aucun trajet en transports en commun trouvé : le départ ou la destination est en dehors de la zone couverte (centre de Paris).'
                        : 'Aucun trajet en transports en commun trouvé pour ce parcours.'}
                  </p>
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
