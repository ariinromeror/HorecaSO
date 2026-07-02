import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loader from '../shared/Loader'

/**
 * Puerta de acceso genérica para rutas privadas.
 * - Sin sesión → redirige a /login.
 * - Con `allowedRoles` y rol del usuario fuera de la lista → redirige a /mesas.
 * - Si recibe `children`, los renderiza; si no, actúa como layout route (`<Outlet />`).
 */
export default function PrivateRoute({ children, allowedRoles }) {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles != null && allowedRoles.length > 0) {
    const rol = user?.rol
    if (!rol || !allowedRoles.includes(rol)) {
      return <Navigate to="/mesas" replace />
    }
  }

  if (children != null) {
    return children
  }

  return <Outlet />
}
