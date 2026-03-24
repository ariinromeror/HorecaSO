export const ROLES_ACCESO = ['admin', 'director']

export const INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
export const SELECT = `${INPUT} appearance-none`
export const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
export const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'
export const TAB_BTN =
  'h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors'

export const ZONAS = [
  { value: '', label: 'Todas' },
  { value: 'interior', label: 'Interior' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'barra', label: 'Barra' },
  { value: 'jardín', label: 'Jardín' },
]

export const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

export function isoToday() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function isoMinusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function fmtEuro(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '0.00 €'
  return `${x.toFixed(2)} €`
}

export function fmtNum(n, suffix = '') {
  const x = Number(n)
  if (Number.isNaN(x)) return `0${suffix}`
  return `${x.toFixed(2)}${suffix}`
}

export function badgeClasificacion(cls) {
  const c = String(cls || '').toLowerCase()
  if (c === 'estrella')
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (c === 'vaca')
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  if (c === 'interrogante')
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  if (c === 'perro')
    return 'bg-red-500/15 text-red-600 dark:text-red-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

export const BCG_ORDER = ['interrogante', 'estrella', 'perro', 'vaca']

export const BCG_META = {
  interrogante: {
    label: 'Interrogante',
    sub: 'Baja popularidad · Alto margen',
    cellClass:
      'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10',
    titleClass: 'text-blue-600 dark:text-blue-400',
  },
  estrella: {
    label: 'Ganador',
    sub: 'Alta popularidad · Alto margen',
    cellClass:
      'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10',
    titleClass: 'text-emerald-600 dark:text-emerald-400',
  },
  perro: {
    label: 'Bajo rendimiento',
    sub: 'Baja popularidad · Bajo margen',
    cellClass: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
    titleClass: 'text-red-600 dark:text-red-400',
  },
  vaca: {
    label: 'Motor de ventas',
    sub: 'Alta popularidad · Bajo margen',
    cellClass:
      'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10',
    titleClass: 'text-amber-600 dark:text-amber-400',
  },
}

/** Etiqueta visible para claves API estrella|vaca|perro|interrogante */
export function labelClasificacion(cls) {
  const c = String(cls || '').toLowerCase()
  return BCG_META[c]?.label || (cls ? String(cls) : '—')
}
