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
} from 'lucide-react'

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
]

/** Lista plana: todas las rutas de navegación (sin grupo colapsable). */
export const NAV_ITEMS = [
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
    path: '/admin/usuarios',
    label: 'Usuarios',
    Icon: UserCog,
    roles: ['admin'],
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
    label: 'Recetas',
    Icon: ChefHat,
    roles: ['admin', 'director', 'cocina'],
  },
  {
    path: '/admin/costes',
    label: 'Gastos operativos',
    Icon: Wallet,
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

export const navScrollStyle = {
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: '#2e3347 transparent',
}
