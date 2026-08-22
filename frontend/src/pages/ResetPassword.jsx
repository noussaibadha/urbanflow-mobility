import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import logo from '../assets/logo.png'

export function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } })
      navigate('/login', {
        state: { message: 'Mot de passe mis à jour. Vous pouvez vous connecter.', type: 'success' },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-logo-row">
        <img src={logo} alt="UrbanFlow Mobility" />
      </div>
      <h1>Réinitialiser mon mot de passe</h1>
      <p className="auth-subtitle">Choisissez un nouveau mot de passe.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Nouveau mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </label>
        <label>
          Confirmer le mot de passe
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </div>
  )
}
