import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { getPerfil, login as apiLogin } from '../services/api'
import api from '../services/api'

const ROLES_FICHAJE_AUTO = [
  'camarero',
  'jefe_sala',
  'cocina',
  'barra',
  'almacen',
]

function readFicharAlLogin() {
  try {
    return localStorage.getItem('horecaso_fichar_al_login') !== '0'
  } catch {
    return true
  }
}

function clearStoredSession() {
  localStorage.removeItem('horecaso_token')
  localStorage.removeItem('horecaso_user')
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    clearStoredSession()
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const applyPerfil = useCallback((userData) => {
    localStorage.setItem('horecaso_user', JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
  }, [])

  const refreshProfile = useCallback(async () => {
    const perfilRes = await getPerfil()
    const userData = perfilRes.data
    applyPerfil(userData)
    return userData
  }, [applyPerfil])

  useEffect(() => {
    const storedToken = localStorage.getItem('horecaso_token')
    const storedUser = localStorage.getItem('horecaso_user')

    if (!storedToken) {
      setIsAuthenticated(false)
      setIsLoading(false)
      return undefined
    }

    setToken(storedToken)
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        setUser(null)
      }
    }
    setIsAuthenticated(true)

    let cancelled = false
    ;(async () => {
      try {
        const perfilRes = await getPerfil()
        if (cancelled) return
        applyPerfil(perfilRes.data)
      } catch (e) {
        if (cancelled) return
        const status = e.response?.status
        if (status === 401 || status === 403 || status === 404) {
          clearStoredSession()
          setToken(null)
          setUser(null)
          setIsAuthenticated(false)
        }
        // Red/timeout: mantener sesión de localStorage; isLoading termina igual
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyPerfil])

  const runFichajeEntradaSiAplica = (userData) => {
    if (
      !readFicharAlLogin() ||
      !userData?.empleado_id ||
      !ROLES_FICHAJE_AUTO.includes(userData.rol)
    ) {
      return
    }
    void api
      .post('/turnos/fichaje-entrada', {
        empleado_id: userData.empleado_id,
      })
      .catch((e) => {
        const msg = e.response?.data?.detail
        if (
          e.response?.status === 400 &&
          typeof msg === 'string' &&
          msg.includes('fichaje de entrada activo')
        ) {
          return
        }
        console.warn('Fichaje automático al login:', msg || e.message)
      })
  }

  const login = useCallback(
    async (email, password) => {
      const res = await apiLogin(email, password)
      const accessToken = res.data.access_token
      localStorage.setItem('horecaso_token', accessToken)
      setToken(accessToken)

      const perfilRes = await getPerfil()
      const userData = perfilRes.data
      applyPerfil(userData)

      runFichajeEntradaSiAplica(userData)
      return userData
    },
    [applyPerfil]
  )

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshProfile,
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
