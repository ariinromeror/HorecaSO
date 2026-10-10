import { useCallback } from 'react'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getVisibleNavItems } from '../components/layout/constants/navConfig'

export default function MenuHubPage() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const items = getVisibleNavItems(user)

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  const inicial = user?.nombre?.trim()?.charAt(0)?.toUpperCase() || '?'
  const tenantLabel =
    (user?.tenant_nombre && String(user.tenant_nombre).trim()) ||
    'Elige una función'

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 -mx-4 mb-6 flex min-h-16 items-center border-b border-[#e2e5ed] bg-[#f4f6f9] px-4 py-3 dark:border-[#2e3347] dark:bg-[#0f1117] md:-mx-8 md:px-8">
        <div className="flex w-full items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              className="h-12 w-12 shrink-0 rounded-full shadow-md"
            />
            <div className="min-w-0 leading-tight">
              <h1 className="text-2xl font-bold text-amber-500">
                HorecaSO
              </h1>
              <p className="truncate text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
                {tenantLabel}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-500"
                aria-hidden
              >
                {inicial}
              </div>
              <div className="min-w-0 max-w-[9rem] leading-tight lg:max-w-[12rem]">
                <p className="truncate text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
                  {user?.nombre || 'Usuario'}
                </p>
                <p className="truncate text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  {user?.rol || '—'}
                </p>
              </div>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-500 sm:hidden"
              aria-hidden
              title={user?.nombre || 'Usuario'}
            >
              {inicial}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
              aria-label={isDark ? 'Modo diurno' : 'Modo nocturno'}
            >
              {isDark ? (
                <Sun size={20} strokeWidth={1.5} aria-hidden />
              ) : (
                <Moon size={20} strokeWidth={1.5} aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-[15px] text-red-500 sm:px-4"
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
        {items.map(({ path, label, Icon }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className="flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-xl border border-[#e2e5ed] bg-white p-4 text-center shadow-sm transition-all duration-150 hover:border-amber-500 hover:shadow-md active:scale-95 dark:border-[#2e3347] dark:bg-[#1a1d27]"
          >
            <Icon
              size={32}
              strokeWidth={1.5}
              className="text-amber-500"
              aria-hidden
            />
            <span className="text-[15px] font-semibold leading-tight text-[#111827] dark:text-[#e8eaf0]">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
