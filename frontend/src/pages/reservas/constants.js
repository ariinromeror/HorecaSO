export const ROLES_ACCESO = ['admin', 'director', 'jefe_sala']

export const INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
export const SELECT = `${INPUT} appearance-none`
export const TEXTAREA = `${INPUT} min-h-[100px] resize-y`
export const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
export const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
export const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
export const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'

export const ESTADOS_RESERVA = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'pendiente' },
  { value: 'confirmada', label: 'confirmada' },
  { value: 'sentada', label: 'sentada' },
  { value: 'cancelada', label: 'cancelada' },
  { value: 'no_show', label: 'no_show' },
]

export const ORIGENES = [
  { value: 'telefono', label: 'Teléfono' },
  { value: 'web', label: 'Web' },
  { value: 'app', label: 'App' },
  { value: 'walk_in', label: 'Walk-in' },
]

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function horaApiToInput(hora) {
  if (hora == null || hora === '') return ''
  const s = String(hora)
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (m) {
    const h = String(Number(m[1])).padStart(2, '0')
    const min = m[2].padStart(2, '0')
    return `${h}:${min}`
  }
  return s.slice(0, 5)
}

export function fechaApiToInput(fecha) {
  if (!fecha) return ''
  return String(fecha).slice(0, 10)
}

export function badgeReservaClass(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'pendiente')
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  if (e === 'confirmada')
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  if (e === 'sentada')
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (e === 'cancelada')
    return 'bg-red-500/15 text-red-600 dark:text-red-400'
  if (e === 'no_show')
    return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

export function badgeListaClass(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'esperando')
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  if (e === 'avisado')
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

export function formatFechaCorta(iso) {
  if (!iso) return '—'
  const d = new Date(String(iso).slice(0, 10))
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatHoraDisplay(hora) {
  if (hora == null) return '—'
  return horaApiToInput(hora) || '—'
}

export function minutosTranscurridos(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 0) return '0 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return `${h} h ${rest} min`
}

export function emptyFormReserva() {
  return {
    nombre_cliente: '',
    telefono: '',
    fecha: todayISO(),
    hora: '',
    num_personas: 2,
    origen: 'telefono',
    notas: '',
  }
}

export function emptyFormLista() {
  return {
    nombre_cliente: '',
    telefono: '',
    num_personas: 2,
    tiempo_estimado: '',
  }
}
