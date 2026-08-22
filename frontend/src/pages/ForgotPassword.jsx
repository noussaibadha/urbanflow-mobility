import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import logo from '../assets/logo.png'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } })
      setSubmitted(true)
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
      <h1>Mot de passe oublié</h1>
      <p className="auth-subtitle">
        Indiquez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </p>

      {submitted ? (
        <p className="auth-notice">
          Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="camille@email.com"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      <p className="auth-footer">
        <Link to="/login">Retour à la connexion</Link>
      </p>
    </div>
  )
}
