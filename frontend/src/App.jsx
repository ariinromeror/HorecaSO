import {
  Navigate,
  Outlet,
  Route,
  BrowserRouter,
  Routes,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './components/layout/AppLayout'
import Loader from './components/shared/Loader'
import LoginPage from './pages/LoginPage'
import MesasPage from './pages/sala/MesasPage'
import TPVPage from './pages/tpv/TPVPage'
import DashboardPage from './pages/director/DashboardPage'
import VentaLivePage from './pages/director/VentaLivePage'
import CartaPage from './pages/admin/CartaPage'
import RecetasPage from './pages/admin/RecetasPage'
import GestionSalaPage from './pages/admin/GestionSalaPage'
import InventarioPage from './pages/inventario/InventarioPage'
import MermasPage from './pages/inventario/MermasPage'
import KDSPage from './pages/cocina/KDSPage'
import ProveedoresPage from './pages/proveedores/ProveedoresPage'
import FacturasProveedorPage from './pages/proveedores/FacturasPage'
import EmpleadosPage from './pages/empleados/EmpleadosPage'
import FichajesPage from './pages/empleados/FichajesPage'
import CuadrantePage from './pages/empleados/CuadrantePage'
import NominasPage from './pages/empleados/NominasPage'

function PrivateRoute({ children, allowedRoles }) {
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

function AdminDirectorRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const rol = user?.rol
  if (rol !== 'admin' && rol !== 'director') {
    return <Navigate to="/mesas" replace />
  }

  return <Outlet />
}

function AdminDirectorJefeSalaRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const rol = user?.rol
  if (
    rol !== 'admin' &&
    rol !== 'director' &&
    rol !== 'jefe_sala'
  ) {
    return <Navigate to="/mesas" replace />
  }

  return <Outlet />
}

function AdminDirectorCocinaRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const rol = user?.rol
  if (rol !== 'admin' && rol !== 'director' && rol !== 'cocina') {
    return <Navigate to="/mesas" replace />
  }

  return <Outlet />
}

const ROLES_INVENTARIO = ['admin', 'director', 'almacen', 'cocina']

function InventarioRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const rol = user?.rol
  if (!rol || !ROLES_INVENTARIO.includes(rol)) {
    return <Navigate to="/mesas" replace />
  }

  return <Outlet />
}

const ROLES_PROVEEDORES = ['admin', 'director', 'almacen', 'cocina']

function ProveedoresRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const rol = user?.rol
  if (!rol || !ROLES_PROVEEDORES.includes(rol)) {
    return <Navigate to="/mesas" replace />
  }

  return <Outlet />
}

/** Página mínima para rutas del menú aún no implementadas (cualquier usuario autenticado). */
function ModulePlaceholder({ name }) {
  return (
    <div className="p-8 text-center text-[#6b7280] dark:text-[#8b90a7]">
      <p className="text-lg">{name} — Próximamente</p>
      <p className="text-sm mt-2">Este módulo está en desarrollo</p>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/mesas" replace />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/kds"
              element={
                <PrivateRoute
                  allowedRoles={[
                    'admin',
                    'director',
                    'jefe_sala',
                    'cocina',
                  ]}
                >
                  <KDSPage />
                </PrivateRoute>
              }
            />

            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/mesas" element={<MesasPage />} />
                <Route element={<AdminDirectorJefeSalaRoute />}>
                  <Route
                    path="/admin/sala"
                    element={<GestionSalaPage />}
                  />
                </Route>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/venta-live" element={<VentaLivePage />} />
                <Route element={<InventarioRoute />}>
                  <Route path="/inventario" element={<InventarioPage />} />
                  <Route path="/inventario/mermas" element={<MermasPage />} />
                </Route>
                <Route element={<ProveedoresRoute />}>
                  <Route path="/proveedores" element={<ProveedoresPage />} />
                  <Route
                    path="/proveedores/facturas"
                    element={<FacturasProveedorPage />}
                  />
                </Route>
                <Route element={<AdminDirectorRoute />}>
                  <Route path="/admin/carta" element={<CartaPage />} />
                </Route>
                <Route element={<AdminDirectorCocinaRoute />}>
                  <Route path="/admin/recetas" element={<RecetasPage />} />
                </Route>
                <Route path="/empleados" element={<EmpleadosPage />} />
                <Route path="/fichajes" element={<FichajesPage />} />
                <Route path="/cuadrante" element={<CuadrantePage />} />
                <Route path="/nominas" element={<NominasPage />} />
                <Route
                  path="/reservas"
                  element={<ModulePlaceholder name="Reservas" />}
                />
                <Route
                  path="/clientes"
                  element={<ModulePlaceholder name="Clientes" />}
                />
                <Route
                  path="/reportes"
                  element={<ModulePlaceholder name="Reportes" />}
                />
              </Route>
              <Route path="/tpv/:mesaId" element={<TPVPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
