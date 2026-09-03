import { Fragment, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

export function Administration() {
  const { user } = useAuth()

  const [adminUsers, setAdminUsers] = useState([])
  const [adminTotal, setAdminTotal] = useState(0)
  const [adminError, setAdminError] = useState(null)
  const [adminStatus, setAdminStatus] = useState(null)
  const [statsUserId, setStatsUserId] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  function loadAdminUsers() {
    apiRequest('/admin/users', { auth: true })
      .then((data) => {
        setAdminUsers(data.users)
        setAdminTotal(data.total)
      })
      .catch((err) => setAdminError(err.message))
  }

  useEffect(() => {
    loadAdminUsers()
  }, [])

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

  return (
    <div className="admin-page">
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
    </div>
  )
}
