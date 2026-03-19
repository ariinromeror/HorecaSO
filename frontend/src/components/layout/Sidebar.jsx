import {
  LayoutGrid,
  Monitor,
  BarChart2,
  Package,
  ChefHat,
  Users,
  Calendar,
  Bell,
  LogOut,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const NAV_ITEMS = [
  {
    path: '/mesas',
    label: 'Sala',
    Icon: LayoutGrid,
    roles: ['admin', 'director', 'jefe_sala', 'camarero'],
  },
  {
    path: '/tpv',
    label: 'TPV',
    Icon: Monitor,
    roles: ['admin', 'camarero', 'jefe_sala'],
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    Icon: BarChart2,
    roles: ['admin', 'director'],
  },
  {
    path: '/inventario',
    label: 'Inventario',
    Icon: Package,
    roles: ['admin', 'director', 'almacen'],
  },
  {
    path: '/recetas',
    label: 'Recetas',
    Icon: ChefHat,
    roles: ['admin', 'director', 'cocina'],
  },
  {
    path: '/empleados',
    label: 'Empleados',
    Icon: Users,
    roles: ['admin', 'director'],
  },
  {
    path: '/reservas',
    label: 'Reservas',
    Icon: Calendar,
    roles: ['admin', 'director', 'jefe_sala'],
  },
  {
    path: '/kds',
    label: 'Cocina KDS',
    Icon: Bell,
    roles: ['admin', 'cocina', 'jefe_sala'],
  },
]

function isNavActive(pathname, itemPath) {
  if (itemPath === '/tpv') {
    return pathname.startsWith('/tpv')
  }
  return (
    pathname === itemPath || pathname.startsWith(`${itemPath}/`)
  )
}

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const rol = user?.rol

  const visibleItems = NAV_ITEMS.filter(
    (item) => rol && item.roles.includes(rol)
  )

  const inicial =
    user?.nombre?.trim()?.charAt(0)?.toUpperCase() || '?'

  const handleLogout = () => {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536] md:hidden"
          aria-label="Cerrar menú"
        >
          <X size={22} strokeWidth={1.5} />
        </button>
      ) : null}

      <div className="flex flex-col p-6">
        <h1 className="text-xl font-bold text-amber-500">HorecaSO</h1>
        <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
          ERP Hostelería
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 pb-4">
        {visibleItems.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => onClose?.()}
            isActive={() => isNavActive(location.pathname, path)}
            className={({ isActive }) =>
              [
                'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium',
                isActive
                  ? 'border-l-[3px] border-amber-500 bg-amber-500/10 pl-[13px] text-amber-500'
                  : 'border-l-[3px] border-transparent pl-4 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]',
              ].join(' ')
            }
          >
            <Icon size={20} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-[#e2e5ed] p-4 dark:border-[#2e3347]">
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
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
        >
          {isDark ? (
            <Sun size={20} strokeWidth={1.5} />
          ) : (
            <Moon size={20} strokeWidth={1.5} />
          )}
          <span>{isDark ? 'Modo diurno' : 'Modo nocturno'}</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
        >
          <LogOut size={20} strokeWidth={1.5} />
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
        className="fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:hidden"
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
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]">
      <SidebarContent />
    </aside>
  )
}
