import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { TransportPicker } from '../components/TransportPicker'
import { PREFERRED_TRANSPORT_OPTIONS, TRANSPORT_MODE_META } from '../lib/transportModes'

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

  useEffect(() => {
    Promise.all([
      apiRequest('/profile', { auth: true }),
      apiRequest('/stations'),
    ])
      .then(([profileData, stationsData]) => {
        setStations(stationsData)
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

  useEffect(() => {
    if (user?.role !== 'admin') return
    apiRequest('/admin/users', { auth: true })
      .then((data) => {
        setAdminUsers(data.users)
        setAdminTotal(data.total)
      })
      .catch((err) => setAdminError(err.message))
  }, [user])

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
          home_station_id: form.home_station_id ? Number(form.home_station_id) : null,
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
            <select name="home_station_id" value={form.home_station_id} onChange={handleChange}>
              <option value="">Aucune</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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

      {user?.role === 'admin' && (
        <section className="admin-section">
          <div className="section-label">Administration</div>
          <div className="white-card">
            <div className="admin-count">
              <span>Utilisateurs inscrits</span>
              <span className="admin-count-value">{adminTotal}</span>
            </div>
            {adminError && <p className="form-error">{adminError}</p>}
            {adminUsers.length > 0 && (
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
