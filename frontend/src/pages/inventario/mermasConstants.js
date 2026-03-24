export const INPUT_MERMAS =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
export const TABLE_WRAP_MERMAS =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl overflow-hidden'
export const BTN_PRIMARY_MERMAS =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
export const BTN_DANGER_MERMAS =
  'h-12 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
export const BTN_SECONDARY_MERMAS =
  'h-10 px-4 rounded-lg bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] text-[#111827] dark:text-[#e8eaf0] font-medium inline-flex items-center justify-center gap-2'

export const ICON_MERMAS = { strokeWidth: 1.5, className: 'shrink-0' }

export const MOTIVO_OPTS = [
  { value: 'caducidad', label: 'Caducidad' },
  { value: 'rotura', label: 'Rotura' },
  { value: 'error_cocina', label: 'Error cocina' },
  { value: 'sobrante', label: 'Sobrante' },
  { value: 'otro', label: 'Otro' },
]

export function firstDayOfMonthISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameLocalDay(isoString, refDate) {
  if (!isoString) return false
  const dt = new Date(isoString)
  if (Number.isNaN(dt.getTime())) return false
  return (
    dt.getFullYear() === refDate.getFullYear() &&
    dt.getMonth() === refDate.getMonth() &&
    dt.getDate() === refDate.getDate()
  )
}

export function formatFechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function parseMotivoCategoria(motivoStr) {
  if (!motivoStr || typeof motivoStr !== 'string') return 'otro'
  const t = motivoStr.trim()
  const base = t.split(':')[0].trim().toLowerCase()
  const known = ['caducidad', 'rotura', 'error_cocina', 'sobrante', 'otro']
  if (known.includes(base)) return base
  return 'otro'
}

export function badgeMotivoClass(cat) {
  switch (cat) {
    case 'caducidad':
      return 'bg-orange-500/10 text-orange-500'
    case 'rotura':
      return 'bg-blue-500/10 text-blue-500'
    case 'error_cocina':
      return 'bg-purple-500/10 text-purple-500'
    case 'sobrante':
      return 'bg-gray-500/10 text-gray-500'
    default:
      return 'bg-gray-500/10 text-gray-500'
  }
}

export function labelMotivo(cat) {
  const o = MOTIVO_OPTS.find((x) => x.value === cat)
  return o ? o.label : cat
}

export function costeLinea(cantidad, costeUnitario) {
  if (costeUnitario == null || Number.isNaN(Number(costeUnitario))) return null
  return Number(cantidad) * Number(costeUnitario)
}

export function formatEuro2(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)
}
