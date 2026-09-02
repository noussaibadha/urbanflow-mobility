import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { TransportPicker } from '../components/TransportPicker'
import { StationAutocomplete } from '../components/StationAutocomplete'
import { PREFERRED_TRANSPORT_OPTIONS, TRANSPORT_MODE_META } from '../lib/transportModes'
import { useLocationConsent } from '../lib/locationConsent'

function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

export function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [locationConsent, setLocationConsent] = useLocationConsent()
  const [stations, setStations] = useState([])
  const [form, setForm] = useState({
    preferred_transport: 'bike',
    home_station_id: '',
    bio: '',
    eco_priority: true,
    avoid_highways: false,
    notifications_enabled: true,
  })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [adminUsers, setAdminUsers] = useState([])
  const [adminTotal, setAdminTotal] = useState(0)
  const [adminError, setAdminError] = useState(null)
  const [adminStatus, setAdminStatus] = useState(null)
  const [statsUserId, setStatsUserId] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      apiRequest('/profile', { auth: true }),
      apiRequest('/transit/stops'),
    ])
      .then(([profileData, stopsData]) => {
        setStations(stopsData.stops)
        if (profileData.profile) {
          setForm({
            preferred_transport: profileData.profile.preferred_transport,
            home_station_id: profileData.profile.home_station_id ?? '',
            bio: profileData.profile.bio ?? '',
            eco_priority: profileData.profile.eco_priority,
            avoid_highways: profileData.profile.avoid_highways,
            notifications_enabled: profileData.profile.notifications_enabled,
          })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function loadAdminUsers() {
    apiRequest('/admin/users', { auth: true })
      .then((data) => {
        setAdminUsers(data.users)
        setAdminTotal(data.total)
      })
      .catch((err) => setAdminError(err.message))
  }

  useEffect(() => {
    if (user?.role !== 'admin') return
    loadAdminUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleRoleChange(targetUser) {
    setAdminError(null)
    setAdminStatus(null)
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin'
    try {
      await apiRequest(`/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        auth: true,
        body: { role: newRole },
      })
      setAdminStatus(`Rôle de ${targetUser.full_name} mis à jour.`)
      loadAdminUsers()
    } catch (err) {
      setAdminError(err.message)
    }
  }

  async function handleSuspendToggle(targetUser) {
    setAdminError(null)
    setAdminStatus(null)
    const newValue = !targetUser.is_suspended
    try {
      await apiRequest(`/admin/users/${targetUser.id}/suspend`, {
        method: 'PATCH',
        auth: true,
        body: { is_suspended: newValue },
      })
      setAdminStatus(`${targetUser.full_name} ${newValue ? 'suspendu' : 'réactivé'}.`)
      loadAdminUsers()
    } catch (err) {
      setAdminError(err.message)
    }
  }

  async function handleDeleteUser(targetUser) {
    if (!window.confirm(`Supprimer définitivement le compte de ${targetUser.full_name} ?`)) return

    setAdminError(null)
    setAdminStatus(null)
    try {
      await apiRequest(`/admin/users/${targetUser.id}`, { method: 'DELETE', auth: true })
      setAdminStatus(`Compte de ${targetUser.full_name} supprimé.`)
      if (statsUserId === targetUser.id) {
        setStatsUserId(null)
        setStats(null)
      }
      loadAdminUsers()
    } catch (err) {
      setAdminError(err.message)
    }
  }

  async function handleToggleStats(targetUser) {
    if (statsUserId === targetUser.id) {
      setStatsUserId(null)
      setStats(null)
      return
    }

    setStatsUserId(targetUser.id)
    setStats(null)
    setStatsError(null)
    setStatsLoading(true)
    try {
      const data = await apiRequest(`/admin/users/${targetUser.id}/stats`, { auth: true })
      setStats(data)
    } catch (err) {
      setStatsError(err.message)
    } finally {
      setStatsLoading(false)
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

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
          home_station_id: form.home_station_id || null,
          bio: form.bio,
          eco_priority: form.eco_priority,
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
          <div className="toggle-row">
            <span className="toggle-label">Priorité éco-responsable</span>
            <button
              type="button"
              className={`toggle-switch${form.eco_priority ? ' on' : ''}`}
              onClick={() => handleToggle('eco_priority')}
            >
              <span className="knob" />
            </button>
          </div>
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

        <div className="white-card">
          <label>
            Station de rattachement
            <StationAutocomplete
              stations={stations}
              value={form.home_station_id}
              onChange={(id) => setForm({ ...form, home_station_id: id })}
              placeholder="Rechercher une station (ex : Châtelet)"
            />
          </label>
          <label style={{ marginTop: '0.75rem', display: 'block' }}>
            Bio
            <textarea name="bio" value={form.bio} onChange={handleChange} maxLength={500} rows={3} />
          </label>
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
        <section className="admin-section">
          <div className="section-label">Administration</div>
          <div className="white-card">
            <div className="admin-count">
              <span>Utilisateurs inscrits</span>
              <span className="admin-count-value">{adminTotal}</span>
            </div>
            {adminStatus && <p className="form-success">{adminStatus}</p>}
            {adminError && <p className="form-error">{adminError}</p>}
            {adminUsers.length > 0 && (
              <div className="admin-table-wrap">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Inscrit le</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u) => {
                      const isSelf = u.id === user.id
                      const isExpanded = statsUserId === u.id

                      return (
                        <Fragment key={u.id}>
                          <tr>
                            <td>{u.full_name}</td>
                            <td>{u.email}</td>
                            <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                            <td>
                              <span className={`admin-status-badge ${u.is_suspended ? 'suspended' : 'active'}`}>
                                {u.is_suspended ? 'Suspendu' : 'Actif'}
                              </span>
                            </td>
                            <td>
                              <div className="admin-actions">
                                {!isSelf && (
                                  <>
                                    <button type="button" onClick={() => handleRoleChange(u)}>
                                      {u.role === 'admin' ? 'Changer en user' : 'Changer en admin'}
                                    </button>
                                    <button type="button" onClick={() => handleSuspendToggle(u)}>
                                      {u.is_suspended ? 'Réactiver' : 'Suspendre'}
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-action-danger"
                                      onClick={() => handleDeleteUser(u)}
                                    >
                                      Supprimer
                                    </button>
                                  </>
                                )}
                                <button type="button" onClick={() => handleToggleStats(u)}>
                                  {isExpanded ? 'Masquer les stats' : 'Voir les stats'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={5}>
                                {statsLoading && <p>Chargement des statistiques...</p>}
                                {statsError && <p className="form-error">{statsError}</p>}
                                {stats && (
                                  <div className="admin-stats-panel">
                                    <span>
                                      Trajets : <strong>{stats.totalTrips}</strong>
                                    </span>
                                    <span>
                                      Distance totale : <strong>{formatDistance(stats.totalDistanceMeters)}</strong>
                                    </span>
                                    <span>
                                      CO₂ économisé : <strong>{stats.co2SavedKg} kg</strong>
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      <button onClick={handleLogout} className="logout-link">
        Se déconnecter
      </button>
    </div>
  )
}
