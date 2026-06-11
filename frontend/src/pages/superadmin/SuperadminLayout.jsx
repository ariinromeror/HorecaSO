import { useCallback, useState } from 'react'
import {
  Building2,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Sun,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const NAV = [
  { to: '/superadmin/tenants', label: 'Tenants', Icon: Building2 },
  { to: '/superadmin/logs', label: 'Logs plataforma', Icon: ScrollText },
]

function NavItems({ onNavigate }) {
  const location = useLocation()
  return (
    <nav className="flex flex-col gap-1 px-2 py-3">
      {NAV.map(({ to, label, Icon }) => {
        const active =
          to === '/superadmin/tenants'
            ? location.pathname.startsWith('/superadmin/tenants')
            : location.pathname.startsWith(to)
        return (
          <NavLink
            key={to}
            to={to}
            end={to !== '/superadmin/tenants'}
            onClick={() => onNavigate?.()}
            className={[
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-l-[3px] border-amber-500 bg-amber-500/10 pl-[9px] text-amber-500'
                : 'border-l-[3px] border-transparent pl-3 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]',
            ].join(' ')}
          >
            <Icon size={20} strokeWidth={1.5} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function SidebarPanel({ onClose, mobile }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
    onClose?.()
  }, [logout, navigate, onClose])

  const inicial =
    user?.nombre?.trim()?.charAt(0)?.toUpperCase() || '?'

  return (
    <>
      {mobile ? (
        <div className="relative flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
              Panel Plataforma
            </p>
            <p className="text-lg font-bold text-amber-500">HorecaSO</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
            aria-label="Cerrar menú"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <div className="border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Panel Plataforma
          </p>
          <p className="text-lg font-bold text-amber-500">HorecaSO</p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavItems onNavigate={onClose} />
      </div>

      <div className="shrink-0 space-y-1 border-t border-[#e2e5ed] p-3 dark:border-[#2e3347]">
        <div className="flex items-center gap-3 px-1 py-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-500"
            aria-hidden
          >
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
              {user?.nombre || 'Usuario'}
            </p>
            <p className="truncate text-xs text-[#6b7280] dark:text-[#8b90a7]">
              {user?.rol || '—'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#6b7280] transition-colors hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
        >
          {isDark ? (
            <Sun size={20} strokeWidth={1.5} className="shrink-0" />
          ) : (
            <Moon size={20} strokeWidth={1.5} className="shrink-0" />
          )}
          <span>{isDark ? 'Modo diurno' : 'Modo nocturno'}</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut size={20} strokeWidth={1.5} className="shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  )
}

export default function SuperadminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9] dark:bg-[#0f1117]">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-56 flex-col border-r border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] sm:w-64 md:flex">
        <div className="flex h-full flex-col">
          <SidebarPanel mobile={false} />
        </div>
      </aside>

      <div
        className="fixed inset-y-0 left-0 z-50 flex h-full w-56 flex-col border-r border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] sm:w-64 md:hidden"
        style={{
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease',
        }}
      >
        <SidebarPanel onClose={() => setDrawerOpen(false)} mobile />
      </div>

      {drawerOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setDrawerOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:ml-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#e2e5ed] bg-white px-4 dark:border-[#2e3347] dark:bg-[#1a1d27] md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-1 hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
            aria-label="Abrir menú"
          >
            <Menu
              size={22}
              strokeWidth={1.5}
              className="text-[#6b7280] dark:text-[#8b90a7]"
            />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Panel Plataforma
            </p>
          </div>
        </header>

        <header className="hidden border-b border-[#e2e5ed] bg-white px-7 py-5 dark:border-[#2e3347] dark:bg-[#1a1d27] md:block">
          <h1 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Panel Plataforma
          </h1>
          <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Gestión de tenants y auditoría
          </p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
