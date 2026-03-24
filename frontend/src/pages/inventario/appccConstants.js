export const ROLES_ACCESO_APPCC = ['admin', 'director', 'almacen', 'cocina']

export const INPUT_APPCC =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
export const SELECT_APPCC = `${INPUT_APPCC} appearance-none`
export const TEXTAREA_APPCC = `${INPUT_APPCC} min-h-[88px] resize-y`
export const SURFACE_APPCC =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
export const BTN_PRIMARY_APPCC =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
export const BTN_SECONDARY_APPCC =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
export const PAGE_BG_APPCC = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'
export const TAB_BTN_APPCC =
  'h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors'

export const TIPOS_CONTROL = [
  { value: '', label: 'Todos' },
  { value: 'temperatura', label: 'Temperatura' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'recepcion', label: 'Recepción' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'apertura', label: 'Apertura' },
  { value: 'cierre', label: 'Cierre' },
]

export const TIPOS_MODAL = TIPOS_CONTROL.filter((t) => t.value)

export function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

export function isoMinusDays(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function formatFechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function labelTipo(t) {
  const x = TIPOS_CONTROL.find((o) => o.value === t)
  return x ? x.label : t || '—'
}

export function emptyFormRegistro() {
  return {
    tipo_control: 'temperatura',
    nombre_equipo: '',
    temperatura: '',
    conforme: true,
    observaciones: '',
    accion_correctora: '',
  }
}
