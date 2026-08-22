import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { geocode } from '../lib/geo'

export function Favorites() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    apiRequest('/favorites', { auth: true })
      .then((data) => setFavorites(data.favorites))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  async function handleAdd(e) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !address.trim()) return

    setSubmitting(true)
    try {
      const geocoded = await geocode(address)
      const data = await apiRequest('/favorites', {
        method: 'POST',
        auth: true,
        body: { name: name.trim(), address: address.trim(), latitude: geocoded.lat, longitude: geocoded.lon },
      })
      setFavorites([...favorites, data.favorite])
      setName('')
      setAddress('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    try {
      await apiRequest(`/favorites/${id}`, { method: 'DELETE', auth: true })
      setFavorites(favorites.filter((f) => f.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  function handleGo(fav) {
    navigate('/planner', { state: { prefillTo: fav.address } })
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div className="favorites-page">
      <h1>Favoris</h1>
      <p className="auth-subtitle">Vos adresses enregistrées</p>

      {user && (
        <form onSubmit={handleAdd} className="favorite-add-form">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex : Domicile)" required />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" required />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      )}

      {error && <p className="form-error">{error}</p>}

      {!user ? (
        <p className="empty-state">
          Aucun favori pour l'instant. Connectez-vous pour enregistrer vos adresses préférées.
        </p>
      ) : favorites.length === 0 ? (
        <p className="empty-state">Aucun favori pour l'instant.</p>
      ) : (
        favorites.map((fav) => (
          <div className="favorite-item" key={fav.id}>
            <div className="favorite-item-icon">
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                <path
                  d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z"
                  fill="#1A3A2A"
                />
                <circle cx="7" cy="7" r="2.6" fill="#B7E4C7" />
              </svg>
            </div>
            <div className="favorite-item-info">
              <div className="fav-name">{fav.name}</div>
              <div className="fav-address">{fav.address}</div>
            </div>
            <button className="favorite-delete-btn" onClick={() => handleDelete(fav.id)} title="Supprimer">
              ×
            </button>
            <button className="favorite-go-btn" onClick={() => handleGo(fav)} title="Itinéraire vers ce lieu">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="#1A3A2A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ))
      )}
    </div>
  )
}
