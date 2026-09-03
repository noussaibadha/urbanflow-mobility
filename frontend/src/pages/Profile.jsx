import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { TransportPicker } from '../components/TransportPicker'
import { PREFERRED_TRANSPORT_OPTIONS, ROUTE_PRIORITY_OPTIONS, TRANSPORT_MODE_META } from '../lib/transportModes'
import { useLocationConsent } from '../lib/locationConsent'

function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [locationConsent, setLocationConsent] = useLocationConsent()
  const [form, setForm] = useState({
    preferred_transport: 'bike',
    route_priority: 'fast',
    avoid_highways: false,
    notifications_enabled: true,
  })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest('/profile', { auth: true })
      .then((profileData) => {
        if (profileData.profile) {
          setForm({
            preferred_transport: profileData.profile.preferred_transport,
            route_priority: profileData.profile.route_priority ?? 'fast',
            avoid_highways: profileData.profile.avoid_highways,
            notifications_enabled: profileData.profile.notifications_enabled,
          })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleToggle(key) {
    setForm({ ...form, [key]: !form[key] })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setStatus(null)
    try {
      await apiRequest('/profile', {
        method: 'PUT',
        auth: true,
        body: {
          preferred_transport: form.preferred_transport,
          route_priority: form.route_priority,
          avoid_highways: form.avoid_highways,
          notifications_enabled: form.notifications_enabled,
        },
      })
      setStatus('Profil mis à jour.')
    } catch (err) {
      setError(err.message)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (loading) return <p>Chargement...</p>

  const transportMeta = TRANSPORT_MODE_META[form.preferred_transport] ?? { label: '', color: '#52B788' }

  return (
    <div className="profile-page">
      <div className="profile-header-card">
        <div className="profile-avatar">{initialsOf(user?.full_name)}</div>
        <div className="profile-name">{user?.full_name}</div>
        <div className="profile-email">{user?.email}</div>
        <div className="profile-transport-badge">
          <span className="dot" style={{ background: transportMeta.color }} />
          <span>{transportMeta.label}</span>
        </div>
      </div>

      <div className="section-label">Préférences de mobilité</div>
      <form onSubmit={handleSubmit}>
        <div className="white-card">
          <TransportPicker
            options={PREFERRED_TRANSPORT_OPTIONS}
            value={form.preferred_transport}
            onChange={(value) => setForm({ ...form, preferred_transport: value })}
          />
        </div>

        <div className="white-card">
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Priorité d'itinéraire</label>
          <TransportPicker
            options={ROUTE_PRIORITY_OPTIONS}
            value={form.route_priority}
            onChange={(value) => setForm({ ...form, route_priority: value })}
          />
        </div>

        <div className="white-card">
          <div className="toggle-row">
            <span className="toggle-label">Éviter les grands axes</span>
            <button
              type="button"
              className={`toggle-switch${form.avoid_highways ? ' on' : ''}`}
              onClick={() => handleToggle('avoid_highways')}
            >
              <span className="knob" />
            </button>
          </div>
          <div className="toggle-row">
            <span className="toggle-label">Notifications de trajet</span>
            <button
              type="button"
              className={`toggle-switch${form.notifications_enabled ? ' on' : ''}`}
              onClick={() => handleToggle('notifications_enabled')}
            >
              <span className="knob" />
            </button>
          </div>
        </div>

        {status && <p className="form-success">{status}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit">Enregistrer</button>
      </form>

      <div className="section-label">Confidentialité</div>
      <div className="white-card">
        <div className="toggle-row">
          <span className="toggle-label">Géolocalisation</span>
          <button
            type="button"
            className={`toggle-switch${locationConsent === 'granted' ? ' on' : ''}`}
            onClick={() => setLocationConsent(locationConsent === 'granted' ? 'denied' : 'granted')}
          >
            <span className="knob" />
          </button>
        </div>
        <p className="profile-consent-hint">
          {locationConsent === 'granted'
            ? "Autorisée — utilisée pour votre position sur la carte et comme point de départ d'itinéraire."
            : locationConsent === 'denied'
              ? "Refusée — saisissez votre adresse de départ manuellement dans l'itinéraire."
              : "Aucun choix enregistré pour l'instant — la question sera posée à la première utilisation."}
        </p>
      </div>

      {user?.role === 'admin' && (
        <button type="button" className="admin-link-btn" onClick={() => navigate('/administration')}>
          Administration
        </button>
      )}

      <button onClick={handleLogout} className="logout-link">
        Se déconnecter
      </button>
    </div>
  )
}
