import { lazy, Suspense } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  BrowserRouter,
  Routes,
} from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './components/layout/AppLayout'
import Loader from './components/shared/Loader'
import ErrorBoundary from './components/shared/ErrorBoundary'
import PrivateRoute from './components/routing/PrivateRoute'
import { queryClient } from './lib/queryClient'

// Fase 8 del PRD de hardening: cada página es su propio chunk (code-splitting
// por ruta) en vez de import estático — reduce el bundle inicial. Envueltas
// en <Suspense fallback={<Loader />}> más abajo.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const MesasPage = lazy(() => import('./pages/sala/MesasPage'))
const TPVPage = lazy(() => import('./pages/tpv/TPVPage'))
const DashboardPage = lazy(() => import('./pages/director/DashboardPage'))
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'))
const VentaLivePage = lazy(() => import('./pages/director/VentaLivePage'))
const CartaPage = lazy(() => import('./pages/admin/carta/CartaPage'))
const RecetasPage = lazy(() => import('./pages/admin/recetas/RecetasPage'))
const ElaboracionesPage = lazy(() =>
  import('./pages/admin/recetas/ElaboracionesPage'),
)
const CostesPage = lazy(() => import('./pages/admin/costes/CostesPage'))
const GestionSalaPage = lazy(() =>
  import('./pages/admin/sala/GestionSalaPage'),
)
const InventarioPage = lazy(() => import('./pages/inventario/InventarioPage'))
const MermasPage = lazy(() => import('./pages/inventario/MermasPage'))
const APPCCPage = lazy(() => import('./pages/inventario/APPCCPage'))
const FIFOPage = lazy(() => import('./pages/inventario/FIFOPage'))
const KDSPage = lazy(() => import('./pages/cocina/KDSPage'))
const ProveedoresPage = lazy(() => import('./pages/proveedores/ProveedoresPage'))
const FacturasProveedorPage = lazy(() =>
  import('./pages/proveedores/FacturasPage'),
)
const EmpleadosPage = lazy(() => import('./pages/empleados/EmpleadosPage'))
const FichajesPage = lazy(() => import('./pages/empleados/FichajesPage'))
const CuadrantePage = lazy(() => import('./pages/empleados/CuadrantePage'))
const NominasPage = lazy(() => import('./pages/empleados/NominasPage'))
const ReservasPage = lazy(() => import('./pages/reservas/ReservasPage'))
const ClientesPage = lazy(() => import('./pages/clientes/ClientesPage'))
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage'))
const SuperadminLayout = lazy(() => import('./pages/superadmin/SuperadminLayout'))
const TenantsListPage = lazy(() => import('./pages/superadmin/TenantsListPage'))
const TenantDetailPage = lazy(() => import('./pages/superadmin/TenantDetailPage'))
const PlatformLogsPage = lazy(() => import('./pages/superadmin/PlatformLogsPage'))
const UsuariosPage = lazy(() => import('./pages/admin/usuarios/UsuariosPage'))

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<Loader />}>
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
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
