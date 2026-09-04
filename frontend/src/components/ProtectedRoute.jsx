import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, message = 'Connectez-vous pour accéder à cette page.' }) {
  const { user, loading } = useAuth()

  if (loading) return <p>Chargement...</p>
  if (!user) return <Navigate to="/login" replace state={{ message }} />

  return children
}
