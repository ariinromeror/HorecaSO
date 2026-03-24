export const ROLES_ACCESO_FIFO = ['admin', 'director', 'almacen']

export const INPUT_FIFO =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
export const SELECT_FIFO = `${INPUT_FIFO} appearance-none`
export const SURFACE_FIFO =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
export const PAGE_BG_FIFO = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'
export const TAB_BTN_FIFO =
  'h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors'
export const BTN_SECONDARY_FIFO =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
export const TABLE_HEAD_FIFO =
  'border-b border-[#e2e5ed] bg-[#f0f2f5] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#8b90a7]'
export const TABLE_CELL_FIFO =
  'border-b border-[#e2e5ed] px-4 py-3 text-sm dark:border-[#2e3347]'

export function parseApiError(e) {
  const det = e.response?.data?.detail
  if (typeof det === 'string') return det
  if (Array.isArray(det))
    return det.map((x) => x.msg || JSON.stringify(x)).join(', ')
  return 'Error en la operación'
}

export function formatFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Días hasta la fecha de caducidad (medianoche local). null si no hay fecha. */
export function diasHastaCaducidad(fechaIso) {
  if (!fechaIso) return null
  const end = new Date(fechaIso)
  if (Number.isNaN(end.getTime())) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end - start) / 86400000)
}

/** Tab Lotes: rojo <3 días, ámbar hasta 7 días, verde >7, gris sin fecha */
export function caducidadLotesClass(dias) {
  if (dias === null) return 'text-[#6b7280] dark:text-[#8b90a7]'
  if (dias < 0) return 'font-medium text-red-600 dark:text-red-400'
  if (dias < 3) return 'font-medium text-red-600 dark:text-red-400'
  if (dias <= 7) return 'font-medium text-amber-600 dark:text-amber-400'
  return 'font-medium text-emerald-600 dark:text-emerald-400'
}

/** Tab alertas: badge rojo <=3, amber <=7, verde >7 */
export function badgeDiasRestantesClass(d) {
  if (d <= 3) return 'bg-red-500/15 text-red-600 dark:text-red-400'
  if (d <= 7) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
}

export function formatEuroFromStrings(cantStr, costeStr) {
  const c = Number(cantStr)
  const u = Number(costeStr)
  if (Number.isNaN(c) || Number.isNaN(u)) return '—'
  return `${(c * u).toFixed(2)} €`
}

export function emptyNuevoLote() {
  return {
    articulo_id: '',
    cantidad: '',
    coste_unitario: '',
    fecha_caducidad: '',
    numero_lote: '',
  }
}

export function emptyConsumir() {
  return {
    articulo_id: '',
    cantidad: '',
    motivo: '',
  }
}
