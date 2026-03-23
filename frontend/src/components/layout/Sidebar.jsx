import { useCallback } from 'react'
import {
  LayoutGrid,
  Settings,
  BarChart2,
  BarChart3,
  Activity,
  ClipboardList,
  Package,
  ChefHat,
  Users,
  Calendar,
  Bell,
  LogOut,
  Sun,
  Moon,
  X,
  Trash2,
  Truck,
  FileText,
  Clock,
  CalendarDays,
  Receipt,
  ShieldCheck,
  Layers,
  Download,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

/** Lista plana: todas las rutas de navegación (sin grupo colapsable). */
const NAV_ITEMS = [
  {
    path: '/mesas',
    label: 'Sala',
    Icon: LayoutGrid,
    roles: ['admin', 'director', 'jefe_sala', 'camarero'],
  },
  {
    path: '/admin/sala',
    label: 'Gestión Sala',
    Icon: Settings,
    roles: ['admin', 'director', 'jefe_sala'],
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    Icon: BarChart2,
    roles: ['admin', 'director'],
  },
  {
    path: '/analytics',
    label: 'Analytics',
    Icon: BarChart3,
    roles: ['admin', 'director'],
  },
  {
    path: '/reportes',
    label: 'Reportes',
    Icon: Download,
    roles: ['admin', 'director', 'jefe_sala', 'almacen'],
  },
  {
    path: '/admin/carta',
    label: 'Carta',
    Icon: ClipboardList,
    roles: ['admin', 'director'],
  },
  {
    path: '/venta-live',
    label: 'Venta Live',
    Icon: Activity,
    roles: ['admin', 'director', 'jefe_sala'],
  },
  {
    path: '/inventario',
    label: 'Inventario',
    Icon: Package,
    roles: ['admin', 'director', 'almacen', 'cocina'],
  },
  {
    path: '/inventario/mermas',
    label: 'Mermas',
    Icon: Trash2,
    roles: ['admin', 'director', 'almacen', 'cocina'],
  },
  {
    path: '/appcc',
    label: 'APPCC',
    Icon: ShieldCheck,
    roles: ['admin', 'director', 'almacen', 'cocina'],
  },
  {
    path: '/fifo',
    label: 'Stock FIFO',
    Icon: Layers,
    roles: ['admin', 'director', 'almacen'],
  },
  {
    path: '/proveedores',
    label: 'Proveedores',
    Icon: Truck,
    roles: ['admin', 'director', 'almacen', 'cocina'],
  },
  {
    path: '/proveedores/facturas',
    label: 'Facturas compra',
    Icon: FileText,
    roles: ['admin', 'director', 'almacen', 'cocina'],
  },
  {
    path: '/admin/recetas',
    label: 'Recetas y Costes',
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
    path: '/fichajes',
    label: 'Control Horario',
    Icon: Clock,
    roles: [
      'admin',
      'director',
      'jefe_sala',
      'camarero',
      'cocina',
      'almacen',
    ],
  },
  {
    path: '/cuadrante',
    label: 'Cuadrante',
    Icon: CalendarDays,
    roles: ['admin', 'director', 'jefe_sala'],
  },
  {
    path: '/nominas',
    label: 'Nóminas',
    Icon: Receipt,
    roles: ['admin', 'director'],
  },
  {
    path: '/reservas',
    label: 'Reservas',
    Icon: Calendar,
    roles: ['admin', 'director', 'jefe_sala'],
  },
  {
    path: '/clientes',
    label: 'Clientes',
    Icon: Users,
    roles: ['admin', 'director', 'jefe_sala'],
  },
  {
    path: '/kds',
    label: 'KDS',
    Icon: Bell,
    roles: [
      'admin',
      'director',
      'jefe_sala',
      'camarero',
      'cocina',
      'barra',
    ],
  },
]

function isNavActive(pathname, item) {
  const itemPath = item.path
  if (itemPath === '/mesas') {
    return pathname === '/mesas' || pathname.startsWith('/tpv')
  }
  if (itemPath === '/inventario') {
    return pathname === '/inventario'
  }
  if (itemPath === '/inventario/mermas') {
    return (
      pathname === '/inventario/mermas' ||
      pathname.startsWith('/inventario/mermas/')
    )
  }
  if (itemPath === '/proveedores') {
    return pathname === '/proveedores'
  }
  if (itemPath === '/proveedores/facturas') {
    return (
      pathname === '/proveedores/facturas' ||
      pathname.startsWith('/proveedores/facturas/')
    )
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

const navScrollStyle = {
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: '#2e3347 transparent',
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
          className="absolute right-4 top-4 rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536] md:hidden"
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

      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-4"
        style={navScrollStyle}
      >
        {visibleItems.map((item) => {
          const { path, label, Icon } = item
          return (
            <NavLink
              key={path}
              to={path}
              onClick={() => onClose?.()}
              isActive={() => isNavActive(location.pathname, item)}
              className={({ isActive }) =>
                [
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium transition-colors',
                  isActive
                    ? 'border-l-[3px] border-amber-500 bg-amber-500/10 pl-[13px] text-amber-500'
                    : 'border-l-[3px] border-transparent pl-4 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]',
                ].join(' ')
              }
            >
              <Icon size={20} strokeWidth={1.5} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>

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
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:flex">
      <SidebarContent />
    </aside>
  )
}
