import { useCallback, useState } from 'react'
import { ArrowLeft, LogOut, Moon, MoreHorizontal, Sun } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getNavLabelForPath } from './constants/navConfig'

export default function ModuleTopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const title = getNavLabelForPath(location.pathname)

  const handleLogout = useCallback(() => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }, [logout, navigate])

  return (
    <header className="h-header-safe sticky top-0 z-30 grid shrink-0 grid-cols-[3rem_1fr_3rem] items-center border-b border-[#e2e5ed] bg-white px-2 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:px-3">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => navigate('/menu')}
          className="flex h-12 w-12 items-center justify-center rounded-lg text-[#111827] hover:bg-[#f0f2f5] dark:text-[#e8eaf0] dark:hover:bg-[#222536]"
          aria-label="Volver al menú"
        >
          <ArrowLeft size={22} strokeWidth={1.5} />
          <span className="sr-only">Atrás</span>
        </button>
      </div>

      <h1 className="min-w-0 truncate px-1 text-center text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
        {title}
      </h1>

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-12 w-12 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
          aria-label="Más opciones"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={22} strokeWidth={1.5} />
        </button>

        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-[#e2e5ed] bg-white py-2 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
              <p className="truncate px-4 py-2 text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
                {user?.nombre || 'Usuario'}
              </p>
              <button
                type="button"
                onClick={() => {
                  toggleTheme()
                  setMenuOpen(false)
                }}
                className="flex h-12 w-full items-center gap-3 px-4 text-left text-[15px] text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
              >
                {isDark ? (
                  <Sun size={20} strokeWidth={1.5} />
                ) : (
                  <Moon size={20} strokeWidth={1.5} />
                )}
                {isDark ? 'Modo diurno' : 'Modo nocturno'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/menu')
                }}
                className="flex h-12 w-full items-center gap-3 px-4 text-left text-[15px] text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
              >
                Menú principal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-12 w-full items-center gap-3 px-4 text-left text-[15px] text-red-500 hover:bg-red-500/10"
              >
                <LogOut size={20} strokeWidth={1.5} />
                Cerrar sesión
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  )
}
