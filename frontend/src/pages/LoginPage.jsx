import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BriefcaseBusiness,
  ChefHat,
  HandPlatter,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

/** Cuentas demo del tenant "Restaurante Prueba" (seed Fase B). */
const DEMO_ACCOUNTS = [
  {
    rol: 'admin',
    label: 'Entrar como Administrador',
    email: 'admin@prueba.com',
    password: 'Admin1234!',
    Icon: ShieldCheck,
  },
  {
    rol: 'camarero',
    label: 'Entrar como Camarero',
    email: 'camarero@prueba.com',
    password: 'Camarero1234!',
    Icon: HandPlatter,
  },
  {
    rol: 'cocina',
    label: 'Entrar como Cocinero',
    email: 'cocina@prueba.com',
    password: 'Cocina1234!',
    Icon: ChefHat,
  },
]

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(null)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/mesas', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const extractError = (e) => {
    const detail = e.response?.data?.detail
    return typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => d.msg || d).join(', ')
        : 'Error al iniciar sesión'
  }

  const handleEntrar = async () => {
    setError('')
    if (!email.trim() || !password) {
      setError('Introduce email y contraseña')
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/mesas', { replace: true })
    } catch (e) {
      setError(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (account) => {
    setError('')
    setEmail(account.email)
    setPassword(account.password)
    setDemoLoading(account.rol)
    try {
      await login(account.email, account.password)
      navigate('/mesas', { replace: true })
    } catch (e) {
      setError(extractError(e))
    } finally {
      setDemoLoading(null)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] placeholder-[#9ca3af] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] dark:placeholder-[#5a5f7a]'

  const anyLoading = loading || demoLoading !== null

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9] p-4 dark:bg-[#0f1117]">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] rounded-lg border border-[#e2e5ed] bg-white p-2 dark:border-[#2e3347] dark:bg-[#1a1d27]"
        aria-label={isDark ? 'Modo diurno' : 'Modo nocturno'}
      >
        {isDark ? (
          <Sun
            size={20}
            strokeWidth={1.5}
            className="text-[#6b7280] dark:text-[#8b90a7]"
          />
        ) : (
          <Moon
            size={20}
            strokeWidth={1.5}
            className="text-[#6b7280] dark:text-[#8b90a7]"
          />
        )}
      </button>

      <div className="w-full max-w-sm rounded-xl border border-[#e2e5ed] bg-white p-8 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <img
          src="/logo.png"
          alt="Logo HorecaSO"
          className="mx-auto mb-4 h-20 w-20 rounded-full shadow-md"
        />
        <h1 className="text-center text-3xl font-bold text-amber-500">
          HorecaSO
        </h1>
        <p className="mb-8 text-center text-sm text-[#6b7280] dark:text-[#8b90a7]">
          ERP de Hostelería
        </p>

        <div className="mb-4">
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="tu@email.com"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]"
          >
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500"
            role="alert"
          >
            <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleEntrar}
          disabled={anyLoading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 font-semibold text-black transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2
                className="h-5 w-5 shrink-0 animate-spin"
                strokeWidth={2.5}
                aria-hidden
              />
              <span>Entrando…</span>
            </>
          ) : (
            'Entrar'
          )}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e2e5ed] dark:bg-[#2e3347]" />
          <span className="text-xs uppercase tracking-wide text-[#9ca3af] dark:text-[#5a5f7a]">
            o
          </span>
          <div className="h-px flex-1 bg-[#e2e5ed] dark:bg-[#2e3347]" />
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10">
          <div className="mb-3 flex items-center justify-center gap-2">
            <BriefcaseBusiness
              size={16}
              strokeWidth={1.5}
              className="text-amber-500"
            />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Acceso de Prueba para Reclutadores
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.rol}
                type="button"
                onClick={() => handleDemoLogin(account)}
                disabled={anyLoading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] text-[15px] font-medium text-[#111827] transition-colors hover:border-amber-500 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
              >
                {demoLoading === account.rol ? (
                  <Loader2
                    size={18}
                    strokeWidth={2}
                    className="shrink-0 animate-spin text-amber-500"
                    aria-hidden
                  />
                ) : (
                  <account.Icon
                    size={18}
                    strokeWidth={1.5}
                    className="shrink-0 text-amber-500"
                  />
                )}
                <span>{account.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-[#9ca3af] dark:text-[#5a5f7a]">
            Entorno demo con datos de ejemplo. Cada rol muestra una vista
            distinta del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
