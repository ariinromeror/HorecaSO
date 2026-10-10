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
import { isModuloActivo } from './utils/tenantModulos'
import LoginPage from './pages/LoginPage'
import MesasPage from './pages/sala/MesasPage'
import TPVPage from './pages/tpv/TPVPage'
import CierreCajaPage from './pages/tpv/CierreCajaPage'
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
import AcuerdoComercialPage from './pages/superadmin/AcuerdoComercialPage'
import UsuariosPage from './pages/admin/usuarios/UsuariosPage'
import MenuHubPage from './pages/MenuHubPage'

function homePathForUser(user) {
  return user?.rol === 'superadmin' ? '/superadmin/tenants' : '/menu'
}

function HomeRedirect() {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={homePathForUser(user)} replace />
}

function SuperadminAwayFromMesas() {
  const { user } = useAuth()
  if (user?.rol === 'superadmin') {
    return <Navigate to="/superadmin/tenants" replace />
  }
  return <MesasPage />
}

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
      return <Navigate to="/menu" replace />
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
    return <Navigate to="/menu" replace />
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
    return <Navigate to="/menu" replace />
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
    return <Navigate to="/menu" replace />
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
    return <Navigate to="/menu" replace />
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
    return <Navigate to="/menu" replace />
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
    return <Navigate to="/menu" replace />
  }

  return <Outlet />
}

/** Bloquea rutas si el tenant no tiene el módulo activo (defensa en profundidad). */
function ModuloRoute({ modulo }) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isModuloActivo(user?.modulos, modulo)) {
    return <Navigate to="/menu" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
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
                <Route
                  path="acuerdo-comercial"
                  element={<AcuerdoComercialPage />}
                />
              </Route>
            </Route>

            <Route
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
                />
              }
            >
              <Route element={<ModuloRoute modulo="kds" />}>
                <Route path="/kds" element={<KDSPage />} />
              </Route>
            </Route>

            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/menu" element={<MenuHubPage />} />
                <Route path="/mesas" element={<SuperadminAwayFromMesas />} />
                <Route element={<ModuloRoute modulo="sala" />}>
                  <Route element={<AdminDirectorJefeSalaRoute />}>
                    <Route
                      path="/admin/sala"
                      element={<GestionSalaPage />}
                    />
                  </Route>
                  <Route element={<AdminOnlyRoute />}>
                    <Route path="/admin/usuarios" element={<UsuariosPage />} />
                  </Route>
                </Route>
                <Route element={<ModuloRoute modulo="reportes" />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/reportes" element={<ReportesPage />} />
                  <Route element={<AdminDirectorCocinaRoute />}>
                    <Route path="/admin/costes" element={<CostesPage />} />
                  </Route>
                </Route>
                <Route element={<ModuloRoute modulo="predicciones" />}>
                  <Route path="/analytics" element={<AnalyticsPage />} />
                </Route>
                <Route element={<ModuloRoute modulo="tpv" />}>
                  <Route path="/venta-live" element={<VentaLivePage />} />
                  <Route element={<AdminDirectorJefeSalaRoute />}>
                    <Route
                      path="/cierre-caja"
                      element={<CierreCajaPage />}
                    />
                  </Route>
                </Route>
                <Route element={<ModuloRoute modulo="inventario" />}>
                  <Route element={<InventarioRoute />}>
                    <Route path="/inventario" element={<InventarioPage />} />
                    <Route path="/inventario/mermas" element={<MermasPage />} />
                  </Route>
                </Route>
                <Route element={<ModuloRoute modulo="appcc" />}>
                  <Route path="/appcc" element={<APPCCPage />} />
                </Route>
                <Route element={<ModuloRoute modulo="fifo" />}>
                  <Route path="/fifo" element={<FIFOPage />} />
                </Route>
                <Route element={<ModuloRoute modulo="proveedores" />}>
                  <Route element={<ProveedoresRoute />}>
                    <Route path="/proveedores" element={<ProveedoresPage />} />
                  </Route>
                </Route>
                <Route element={<ModuloRoute modulo="ia_facturas" />}>
                  <Route element={<ProveedoresRoute />}>
                    <Route
                      path="/proveedores/facturas"
                      element={<FacturasProveedorPage />}
                    />
                  </Route>
                </Route>
                <Route element={<ModuloRoute modulo="carta" />}>
                  <Route element={<AdminDirectorRoute />}>
                    <Route path="/admin/carta" element={<CartaPage />} />
                  </Route>
                  <Route element={<AdminDirectorCocinaRoute />}>
                    <Route path="/admin/recetas" element={<RecetasPage />} />
                    <Route
                      path="/admin/recetas/elaboraciones"
                      element={<ElaboracionesPage />}
                    />
                  </Route>
                </Route>
                <Route element={<ModuloRoute modulo="empleados" />}>
                  <Route path="/empleados" element={<EmpleadosPage />} />
                  <Route path="/fichajes" element={<FichajesPage />} />
                  <Route path="/cuadrante" element={<CuadrantePage />} />
                </Route>
                <Route element={<ModuloRoute modulo="nominas" />}>
                  <Route path="/nominas" element={<NominasPage />} />
                </Route>
                <Route element={<ModuloRoute modulo="reservas" />}>
                  <Route path="/reservas" element={<ReservasPage />} />
                </Route>
                <Route element={<ModuloRoute modulo="clientes" />}>
                  <Route path="/clientes" element={<ClientesPage />} />
                </Route>
              </Route>
              <Route path="/tpv/:mesaId" element={<TPVPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
