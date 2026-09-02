import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RouteMap } from '../components/RouteMap'
import { GreetingCard } from '../components/GreetingCard'
import { AddressAutocomplete } from '../components/AddressAutocomplete'
import { useConsentedLocation } from '../lib/geo'
import { LocationConsentModal } from '../components/LocationConsentModal'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'

function PinIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
      <path d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z" fill="#1A3A2A" />
      <circle cx="7" cy="7" r="2.6" fill="#B7E4C7" />
    </svg>
  )
}

export function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    position: livePosition,
    error: geoError,
    active: locationEnabled,
    showPrompt: showLocationConsent,
    requestLocation,
    respondConsent,
    disable: disableLocation,
  } = useConsentedLocation()
  const [sharedStations, setSharedStations] = useState([])
  const [searchText, setSearchText] = useState('')
  const [summary, setSummary] = useState(null)
  const [favorites, setFavorites] = useState(null)

  useEffect(() => {
    apiRequest('/shared-mobility/stations')
      .then((data) => setSharedStations(data.stations))
      .catch(() => setSharedStations([]))
  }, [])

  useEffect(() => {
    if (!user) {
      setSummary(null)
      setFavorites(null)
      return
    }
    apiRequest('/trips/summary', { auth: true })
      .then(setSummary)
      .catch(() => setSummary(null))
    apiRequest('/favorites', { auth: true })
      .then((data) => setFavorites(data.favorites))
      .catch(() => setFavorites([]))
  }, [user])

  function goToPlanner(destination, point) {
    navigate('/planner', { state: { prefillTo: destination, prefillPoint: point } })
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    if (searchText.trim()) goToPlanner(searchText.trim())
  }

  const favoriteShortcuts = favorites?.slice(0, 3) ?? []

  return (
    <div className="home-page">
      {user && <GreetingCard fullName={user.full_name} co2SavedKg={summary?.co2SavedKg} />}

      <div className="white-card home-search-card">
        <form className="home-search-bar" onSubmit={handleSearchSubmit}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#1A3A2A" strokeWidth="1.6" />
            <line x1="11" y1="11" x2="15" y2="15" stroke="#1A3A2A" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <AddressAutocomplete
            value={searchText}
            onChange={setSearchText}
            onSelect={(suggestion) => goToPlanner(suggestion.label, suggestion)}
            placeholder="Où allez-vous ?"
          />
        </form>
      </div>

      <div className="card-heading">Vos adresses</div>
      {favoriteShortcuts.length > 0 ? (
        favoriteShortcuts.map((fav) => (
          <div
            key={fav.id}
            className="favorite-item"
            role="button"
            tabIndex={0}
            onClick={() => goToPlanner(fav.address, { lat: fav.latitude, lon: fav.longitude, label: fav.address })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goToPlanner(fav.address, { lat: fav.latitude, lon: fav.longitude, label: fav.address })
            }}
          >
            <div className="favorite-item-icon">
              <PinIcon />
            </div>
            <div className="favorite-item-info">
              <div className="fav-name">{fav.name}</div>
              <div className="fav-address">{fav.address}</div>
            </div>
            <span className="favorite-go-btn" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="#1A3A2A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        ))
      ) : (
        <p className="empty-state">Ajoutez vos adresses favorites pour un accès rapide.</p>
      )}

      <div className="home-map-wrap">
        <RouteMap livePosition={livePosition} sharedStations={sharedStations} />

        <button
          type="button"
          className={`home-location-pill${locationEnabled ? ' active' : ''}`}
          onClick={() => (locationEnabled ? disableLocation() : requestLocation())}
        >
          <span className="dot" />
          {locationEnabled ? 'Ma position activée' : 'Activer ma position'}
        </button>

        {showLocationConsent && (
          <LocationConsentModal onAllow={() => respondConsent(true)} onDeny={() => respondConsent(false)} />
        )}

        {geoError && locationEnabled && (
          <div className="home-velib-pill home-location-error">{geoError.message}</div>
        )}

        <div className="home-velib-pill">
          <span className="dot" />
          <span>Stations Vélib à proximité ({sharedStations.length})</span>
        </div>
      </div>
    </div>
  )
}
