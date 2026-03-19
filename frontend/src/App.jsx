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

function PrivateRoute() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/mesas" replace />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/mesas" element={<MesasPage />} />
                <Route
                  path="/tpv"
                  element={<Navigate to="/mesas" replace />}
                />
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route path="/tpv/:mesaId" element={<TPVPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
