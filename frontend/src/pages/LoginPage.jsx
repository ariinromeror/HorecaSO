import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/mesas', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

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
      const detail = e.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || d).join(', ')
            : 'Error al iniciar sesión'
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] placeholder-[#9ca3af] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] dark:placeholder-[#5a5f7a]'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9] p-4 dark:bg-[#0f1117]">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed right-4 top-4 rounded-lg border border-[#e2e5ed] bg-white p-2 dark:border-[#2e3347] dark:bg-[#1a1d27]"
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
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 font-semibold text-black hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
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
      </div>
    </div>
  )
}
