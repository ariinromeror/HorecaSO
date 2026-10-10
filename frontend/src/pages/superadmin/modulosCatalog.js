/** Catálogo de módulos autorizables por superadmin (tenants.modulos). */
export const DEFAULT_MODULOS = {
  sala: true,
  tpv: true,
  kds: true,
  carta: true,
  inventario: true,
  reservas: true,
  reportes: true,
  fifo: false,
  nominas: false,
  ia_facturas: false,
  predicciones: false,
  empleados: true,
  proveedores: true,
  clientes: true,
  appcc: true,
}

export const MODULO_LABELS = [
  { key: 'sala', label: 'Sala / mesas' },
  { key: 'tpv', label: 'TPV / Venta Live' },
  { key: 'kds', label: 'KDS cocina/barra' },
  { key: 'carta', label: 'Carta y recetas' },
  { key: 'inventario', label: 'Inventario y mermas' },
  { key: 'reservas', label: 'Reservas' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'empleados', label: 'Empleados / fichajes' },
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'appcc', label: 'APPCC' },
  { key: 'fifo', label: 'Stock FIFO' },
  { key: 'nominas', label: 'Nóminas' },
  { key: 'ia_facturas', label: 'IA facturas compra' },
  { key: 'predicciones', label: 'Previsión mermas' },
]

export function suggestEmailSlug(nombre) {
  if (!nombre) return ''
  return String(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}
