import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest, getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    apiRequest('/auth/me', { auth: true })
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function register({ email, password, full_name }) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { email, password, full_name },
    })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function login({ email, password }) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
