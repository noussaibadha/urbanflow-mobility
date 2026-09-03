import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, requireAdmin = false, message = 'Connectez-vous pour accéder à cette page.' }) {
  const { user, loading } = useAuth()

  if (loading) return <p>Chargement...</p>
  if (!user) return <Navigate to="/login" replace state={{ message }} />
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/profile" replace />

  return children
}
