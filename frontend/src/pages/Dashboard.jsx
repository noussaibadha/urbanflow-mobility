import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { TRANSPORT_MODE_META } from '../lib/transportModes'
import { GreetingCard } from '../components/GreetingCard'

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    apiRequest('/trips/summary', { auth: true })
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <p>Chargement...</p>

  const maxCount = summary ? Math.max(1, ...summary.weeklyChart.map((d) => d.count)) : 1

  return (
    <div className="dashboard-page">
      {user ? (
        <GreetingCard fullName={user.full_name} co2SavedKg={summary?.co2SavedKg} />
      ) : (
        <div className="dashboard-header-card">
          <h1>Tableau de bord</h1>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {!user ? (
        <div className="white-card">
          <p className="empty-state">
            Aucune donnée pour l'instant. Connectez-vous pour suivre vos trajets et votre empreinte carbone.
          </p>
        </div>
      ) : summary && summary.totalTrips === 0 ? (
        <div className="white-card">
          <p className="empty-state">
            Aucun trajet enregistré pour l'instant. Calculez un itinéraire et confirmez-le pour voir vos
            statistiques ici.
          </p>
        </div>
      ) : (
        summary && (
          <>
            <div className="white-card">
              <div className="card-heading">Trajets de la semaine</div>
              <div className="weekly-chart">
                {summary.weeklyChart.map((d, i) => (
                  <div key={i} className="weekly-chart-col">
                    <div
                      className="weekly-chart-bar"
                      style={{ height: `${Math.max(6, (d.count / maxCount) * 70)}px` }}
                    />
                    <div className="day-label">{d.day}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-heading">Derniers trajets</div>
            <div className="white-card">
              {summary.recentTrips.map((trip) => {
                const meta = TRANSPORT_MODE_META[trip.mode] ?? { color: '#52B788' }
                return (
                  <div className="trip-row" key={trip.id}>
                    <div className="trip-row-icon" style={{ background: meta.color + '22' }}>
                      <span className="dot" style={{ background: meta.color }} />
                    </div>
                    <div className="trip-row-info">
                      <div className="mode-label">{trip.modeLabel}</div>
                      <div className="trip-date">{formatDate(trip.createdAt)}</div>
                    </div>
                    <div className="trip-distance">{formatDistance(trip.distanceMeters)}</div>
                  </div>
                )
              })}
            </div>

            <div className="white-card">
              <div className="eco-score-row">
                <span>Score écologique</span>
                <span className="eco-score-value">{summary.ecoScore}%</span>
              </div>
              <div className="eco-score-bar-track">
                <div className="eco-score-bar-fill" style={{ width: `${summary.ecoScore}%` }} />
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}
