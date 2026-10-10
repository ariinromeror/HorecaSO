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
  Trash2,
  Truck,
  FileText,
  Clock,
  CalendarDays,
  Receipt,
  ShieldCheck,
  Layers,
  Download,
  Building2,
  ScrollText,
  UserCog,
  Wallet,
  Banknote,
} from 'lucide-react'
import { isModuloActivo } from '../../../utils/tenantModulos'

/** Panel plataforma — solo `superadmin`. */
export const SUPERADMIN_NAV_ITEMS = [
  {
    path: '/superadmin/tenants',
    label: 'Tenants (plataforma)',
    Icon: Building2,
    roles: ['superadmin'],
  },
  {
    path: '/superadmin/logs',
    label: 'Logs plataforma',
    Icon: ScrollText,
    roles: ['superadmin'],
  },
  {
    path: '/superadmin/acuerdo-comercial',
    label: 'Acuerdo comercial',
    Icon: FileText,
    roles: ['superadmin'],
  },
]

/** Lista plana: todas las rutas de navegación (sin grupo colapsable). */
export const NAV_ITEMS = [
  {
    path: '/mesas',
    label: 'Sala',
    Icon: LayoutGrid,
    roles: ['admin', 'director', 'jefe_sala', 'camarero'],
    modulo: 'sala',
  },
  {
    path: '/admin/sala',
    label: 'Gestión Sala',
    Icon: Settings,
    roles: ['admin', 'director', 'jefe_sala'],
    modulo: 'sala',
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    Icon: BarChart2,
    roles: ['admin', 'director'],
    modulo: 'reportes',
  },
  {
    path: '/analytics',
    label: 'Analytics',
    Icon: BarChart3,
    roles: ['admin', 'director'],
    modulo: 'predicciones',
  },
  {
    path: '/reportes',
    label: 'Reportes',
    Icon: Download,
    roles: ['admin', 'director', 'jefe_sala', 'almacen'],
    modulo: 'reportes',
  },
  {
    path: '/admin/carta',
    label: 'Carta',
    Icon: ClipboardList,
    roles: ['admin', 'director'],
    modulo: 'carta',
  },
  {
    path: '/admin/usuarios',
    label: 'Usuarios',
    Icon: UserCog,
    roles: ['admin'],
    modulo: 'sala',
  },
  {
    path: '/venta-live',
    label: 'Venta Live',
    Icon: Activity,
    roles: ['admin', 'director', 'jefe_sala'],
    modulo: 'tpv',
  },
  {
    path: '/cierre-caja',
    label: 'Cierre de caja',
    Icon: Banknote,
    roles: ['admin', 'director', 'jefe_sala'],
    modulo: 'tpv',
  },
  {
    path: '/inventario',
    label: 'Inventario',
    Icon: Package,
    roles: ['admin', 'director', 'almacen', 'cocina'],
    modulo: 'inventario',
  },
  {
    path: '/inventario/mermas',
    label: 'Mermas',
    Icon: Trash2,
    roles: ['admin', 'director', 'almacen', 'cocina'],
    modulo: 'inventario',
  },
  {
    path: '/appcc',
    label: 'APPCC',
    Icon: ShieldCheck,
    roles: ['admin', 'director', 'almacen', 'cocina'],
    modulo: 'appcc',
  },
  {
    path: '/fifo',
    label: 'Stock FIFO',
    Icon: Layers,
    roles: ['admin', 'director', 'almacen'],
    modulo: 'fifo',
  },
  {
    path: '/proveedores',
    label: 'Proveedores',
    Icon: Truck,
    roles: ['admin', 'director', 'almacen', 'cocina'],
    modulo: 'proveedores',
  },
  {
    path: '/proveedores/facturas',
    label: 'Facturas compra',
    Icon: FileText,
    roles: ['admin', 'director', 'almacen', 'cocina'],
    modulo: 'ia_facturas',
  },
  {
    path: '/admin/recetas',
    label: 'Recetas',
    Icon: ChefHat,
    roles: ['admin', 'director', 'cocina'],
    modulo: 'carta',
  },
  {
    path: '/admin/costes',
    label: 'Gastos operativos',
    Icon: Wallet,
    roles: ['admin', 'director', 'cocina'],
    modulo: 'reportes',
  },
  {
    path: '/empleados',
    label: 'Empleados',
    Icon: Users,
    roles: ['admin', 'director'],
    modulo: 'empleados',
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
    modulo: 'empleados',
  },
  {
    path: '/cuadrante',
    label: 'Cuadrante',
    Icon: CalendarDays,
    roles: ['admin', 'director', 'jefe_sala'],
    modulo: 'empleados',
  },
  {
    path: '/nominas',
    label: 'Nóminas',
    Icon: Receipt,
    roles: ['admin', 'director'],
    modulo: 'nominas',
  },
  {
    path: '/reservas',
    label: 'Reservas',
    Icon: Calendar,
    roles: ['admin', 'director', 'jefe_sala'],
    modulo: 'reservas',
  },
  {
    path: '/clientes',
    label: 'Clientes',
    Icon: Users,
    roles: ['admin', 'director', 'jefe_sala'],
    modulo: 'clientes',
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
    modulo: 'kds',
  },
]

export function isNavActive(pathname, item) {
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
  if (itemPath === '/superadmin/tenants') {
    return pathname.startsWith('/superadmin/tenants')
  }
  if (itemPath === '/superadmin/logs') {
    return (
      pathname === '/superadmin/logs' ||
      pathname.startsWith('/superadmin/logs/')
    )
  }
  if (itemPath === '/admin/usuarios') {
    return (
      pathname === '/admin/usuarios' ||
      pathname.startsWith('/admin/usuarios/')
    )
  }
  if (itemPath === '/admin/recetas') {
    return (
      pathname === '/admin/recetas' ||
      pathname.startsWith('/admin/recetas/')
    )
  }
  if (itemPath === '/admin/costes') {
    return (
      pathname === '/admin/costes' ||
      pathname.startsWith('/admin/costes/')
    )
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

/** Ítems visibles según rol + módulos del tenant. */
export function getVisibleNavItems(user) {
  const rol = user?.rol
  if (rol === 'superadmin') {
    return SUPERADMIN_NAV_ITEMS
  }
  return NAV_ITEMS.filter((item) => {
    if (!rol || !item.roles.includes(rol)) return false
    return isModuloActivo(user?.modulos, item.modulo)
  })
}

/** Título de headbar según ruta. */
export function getNavLabelForPath(pathname) {
  if (pathname === '/menu') return 'Menú'
  const all = [...NAV_ITEMS, ...SUPERADMIN_NAV_ITEMS]
  const match = all.find((item) => isNavActive(pathname, item))
  return match?.label || 'HorecaSO'
}

export const navScrollStyle = {
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: '#2e3347 transparent',
}
