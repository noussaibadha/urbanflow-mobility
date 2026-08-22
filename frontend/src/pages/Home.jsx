import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RouteMap } from '../components/RouteMap'
import { watchPosition } from '../lib/geo'
import { apiRequest } from '../api/client'
import { PLANNER_MODE_OPTIONS } from '../lib/transportModes'

export function Home() {
  const navigate = useNavigate()
  const [livePosition, setLivePosition] = useState(null)
  const [sharedStations, setSharedStations] = useState([])
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    const stop = watchPosition({ onUpdate: setLivePosition, onError: () => {} })
    return stop
  }, [])

  useEffect(() => {
    apiRequest('/shared-mobility/stations')
      .then((data) => setSharedStations(data.stations))
      .catch(() => setSharedStations([]))
  }, [])

  function handleSearchSubmit(e) {
    e.preventDefault()
    if (searchText.trim()) {
      navigate('/planner', { state: { prefillTo: searchText.trim() } })
    }
  }

  function handleQuickMode(mode) {
    navigate('/planner', { state: { prefillMode: mode } })
  }

  return (
    <div className="home-page">
      <div className="home-map-wrap">
        <RouteMap livePosition={livePosition} sharedStations={sharedStations} />

        <form className="home-search-bar" onSubmit={handleSearchSubmit}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#1A3A2A" strokeWidth="1.6" />
            <line x1="11" y1="11" x2="15" y2="15" stroke="#1A3A2A" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Où allez-vous ?"
          />
        </form>

        <div className="home-quick-modes">
          {PLANNER_MODE_OPTIONS.map((m) => (
            <button key={m.value} type="button" className="home-quick-mode" onClick={() => handleQuickMode(m.value)}>
              <span className="dot" style={{ background: m.color }} />
              <span className="label">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="home-velib-pill">
          <span className="dot" />
          <span>Stations Vélib à proximité ({sharedStations.length})</span>
        </div>
      </div>
    </div>
  )
}
