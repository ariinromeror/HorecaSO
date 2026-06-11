import { useCallback } from 'react'
import { LogOut, Moon, Sun, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import SidebarNav from './SidebarNav'

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const inicial =
    user?.nombre?.trim()?.charAt(0)?.toUpperCase() || '?'

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
    onClose?.()
  }, [logout, navigate, onClose])

  return (
    <>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536] md:hidden"
          aria-label="Cerrar menú"
        >
          <X size={22} strokeWidth={1.5} />
        </button>
      ) : null}

      <div className="relative flex shrink-0 items-center justify-between gap-2 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-amber-500">HorecaSO</h1>
          <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
            ERP Hostelería
          </p>
        </div>
      </div>

      <SidebarNav onClose={onClose} />

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

export default function Sidebar({ isOpen, onClose }) {
  const isDrawer = typeof isOpen === 'boolean'

  if (isDrawer) {
    return (
      <div
        className="pt-safe fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:hidden"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms',
        }}
      >
        <SidebarContent onClose={onClose} />
      </div>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:flex">
      <SidebarContent />
    </aside>
  )
}
