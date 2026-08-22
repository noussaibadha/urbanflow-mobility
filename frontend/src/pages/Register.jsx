import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../api/client'
import { TransportPicker } from '../components/TransportPicker'
import { PREFERRED_TRANSPORT_OPTIONS } from '../lib/transportModes'
import logo from '../assets/logo.png'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [transport, setTransport] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!transport) {
      setError('Veuillez choisir un mode de transport préféré.')
      return
    }

    setSubmitting(true)
    try {
      await register(form)
      await apiRequest('/profile', {
        method: 'PUT',
        auth: true,
        body: { preferred_transport: transport },
      })
      navigate('/')
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
      <h1>Créer un compte</h1>
      <p className="auth-subtitle">Rejoignez UrbanFlow Mobility</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Nom complet
          <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Camille Dubois" required />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="camille@email.com"
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </label>

        <label>
          Préférence de transport
          <TransportPicker options={PREFERRED_TRANSPORT_OPTIONS} value={transport} onChange={setTransport} />
        </label>

        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>
      <p className="auth-footer">
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  )
}
