import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { getPerfil, login as apiLogin } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('horecaso_token')
    const storedUser = localStorage.getItem('horecaso_user')

    if (storedToken) {
      setToken(storedToken)
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        setUser(null)
      }
    }
    setIsAuthenticated(!!storedToken)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await apiLogin(email, password)
    const accessToken = res.data.access_token
    localStorage.setItem('horecaso_token', accessToken)
    setToken(accessToken)

    const perfilRes = await getPerfil()
    const userData = perfilRes.data
    localStorage.setItem('horecaso_user', JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('horecaso_token')
    localStorage.removeItem('horecaso_user')
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
