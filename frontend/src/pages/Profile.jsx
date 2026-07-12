import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'

const TRANSPORT_LABELS = {
  bike: 'Vélo',
  scooter: 'Trottinette',
  car: 'Voiture',
  public_transport: 'Transport en commun',
  walk: 'Marche',
}

export function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stations, setStations] = useState([])
  const [form, setForm] = useState({ preferred_transport: 'bike', home_station_id: '', bio: '' })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

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
          })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
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

  return (
    <div className="profile-page">
      <h1>Mon profil</h1>
      <p>
        <strong>{user?.full_name}</strong> — {user?.email}
      </p>

      <h2>Profil de mobilité</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Mode de transport préféré
          <select name="preferred_transport" value={form.preferred_transport} onChange={handleChange}>
            {Object.entries(TRANSPORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
        <label>
          Bio
          <textarea name="bio" value={form.bio} onChange={handleChange} maxLength={500} rows={3} />
        </label>
        {status && <p className="form-success">{status}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit">Enregistrer</button>
      </form>

      <button onClick={handleLogout} className="logout-btn">
        Se déconnecter
      </button>
    </div>
  )
}
