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
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import VentaLivePage from './pages/director/VentaLivePage'
import CartaPage from './pages/admin/carta/CartaPage'
import RecetasPage from './pages/admin/recetas/RecetasPage'
import ElaboracionesPage from './pages/admin/recetas/ElaboracionesPage'
import CostesPage from './pages/admin/costes/CostesPage'
import GestionSalaPage from './pages/admin/sala/GestionSalaPage'
import InventarioPage from './pages/inventario/InventarioPage'
import MermasPage from './pages/inventario/MermasPage'
import APPCCPage from './pages/inventario/APPCCPage'
import FIFOPage from './pages/inventario/FIFOPage'
import KDSPage from './pages/cocina/KDSPage'
import ProveedoresPage from './pages/proveedores/ProveedoresPage'
import FacturasProveedorPage from './pages/proveedores/FacturasPage'
import EmpleadosPage from './pages/empleados/EmpleadosPage'
import FichajesPage from './pages/empleados/FichajesPage'
import CuadrantePage from './pages/empleados/CuadrantePage'
import NominasPage from './pages/empleados/NominasPage'
import ReservasPage from './pages/reservas/ReservasPage'
import ClientesPage from './pages/clientes/ClientesPage'
import ReportesPage from './pages/reportes/ReportesPage'
import SuperadminLayout from './pages/superadmin/SuperadminLayout'
import TenantsListPage from './pages/superadmin/TenantsListPage'
import TenantDetailPage from './pages/superadmin/TenantDetailPage'
import PlatformLogsPage from './pages/superadmin/PlatformLogsPage'
import UsuariosPage from './pages/admin/usuarios/UsuariosPage'

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

function AdminOnlyRoute() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.rol !== 'admin') {
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

            <Route element={<PrivateRoute allowedRoles={['superadmin']} />}>
              <Route path="/superadmin" element={<SuperadminLayout />}>
                <Route
                  index
                  element={<Navigate to="/superadmin/tenants" replace />}
                />
                <Route path="tenants" element={<TenantsListPage />} />
                <Route path="tenants/:id" element={<TenantDetailPage />} />
                <Route path="logs" element={<PlatformLogsPage />} />
              </Route>
            </Route>

            <Route
              path="/kds"
              element={
                <PrivateRoute
                  allowedRoles={[
                    'admin',
                    'director',
                    'jefe_sala',
                    'camarero',
                    'cocina',
                    'barra',
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
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/venta-live" element={<VentaLivePage />} />
                <Route element={<InventarioRoute />}>
                  <Route path="/inventario" element={<InventarioPage />} />
                  <Route path="/inventario/mermas" element={<MermasPage />} />
                </Route>
                <Route path="/appcc" element={<APPCCPage />} />
                <Route path="/fifo" element={<FIFOPage />} />
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
                <Route element={<AdminOnlyRoute />}>
                  <Route path="/admin/usuarios" element={<UsuariosPage />} />
                </Route>
                <Route element={<AdminDirectorCocinaRoute />}>
                  <Route path="/admin/recetas" element={<RecetasPage />} />
                  <Route
                    path="/admin/recetas/elaboraciones"
                    element={<ElaboracionesPage />}
                  />
                  <Route path="/admin/costes" element={<CostesPage />} />
                </Route>
                <Route path="/empleados" element={<EmpleadosPage />} />
                <Route path="/fichajes" element={<FichajesPage />} />
                <Route path="/cuadrante" element={<CuadrantePage />} />
                <Route path="/nominas" element={<NominasPage />} />
                <Route path="/reservas" element={<ReservasPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/reportes" element={<ReportesPage />} />
              </Route>
              <Route path="/tpv/:mesaId" element={<TPVPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
