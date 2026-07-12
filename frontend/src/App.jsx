import { useEffect, useState } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import './App.css'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Register } from './pages/Register'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'

function Home() {
  const [health, setHealth] = useState(null)
  const [stations, setStations] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setError(err.message))

    fetch('/api/stations')
      .then((res) => res.json())
      .then(setStations)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <h1>UrbanFlow Mobility</h1>
      <div className="card">
        <p>
          API status:{' '}
          {error ? (
            <span style={{ color: 'crimson' }}>{error}</span>
          ) : health ? (
            <span style={{ color: 'seagreen' }}>{health.status}</span>
          ) : (
            'checking...'
          )}
        </p>
        <h2>Stations</h2>
        {stations.length === 0 ? (
          <p className="read-the-docs">No stations yet.</p>
        ) : (
          <ul>
            {stations.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function Nav() {
  const { user, logout } = useAuth()

  return (
    <nav className="nav">
      <Link to="/">UrbanFlow Mobility</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/profile">Profil</Link>
            <button onClick={logout}>Déconnexion</button>
          </>
        ) : (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        )}
      </div>
    </nav>
  )
}

function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
