export const INPUT =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
export const CARD_BASE =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl'
export const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
export const BTN_SECONDARY =
  'h-10 px-4 rounded-lg bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] text-[#111827] dark:text-[#e8eaf0] font-medium transition-colors inline-flex items-center justify-center gap-2'
export const BTN_DANGER =
  'h-10 px-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed'

export const ICON = { strokeWidth: 1.5, className: 'shrink-0' }

export const ZONAS = [
  { value: 'interior', label: 'Interior' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'barra', label: 'Barra' },
  { value: 'privado', label: 'Privado' },
  { value: 'jardín', label: 'Jardín' },
]

export const FORMAS = [
  { value: 'cuadrada', label: 'Cuadrada' },
  { value: 'redonda', label: 'Redonda' },
  { value: 'rectangular', label: 'Rectangular' },
]

export function normZona(z) {
  return String(z || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300/g, '')
}

export function zonaBadgeClass(z) {
  const zl = normZona(z)
  if (zl === 'interior' || zl === 'sala')
    return 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
  if (zl === 'terraza')
    return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  if (zl === 'barra')
    return 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
  if (zl === 'privado')
    return 'bg-purple-500/10 text-purple-500 dark:text-purple-400'
  if (zl === 'jardin' || zl === 'jardín')
    return 'bg-green-500/10 text-green-500 dark:text-green-400'
  return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
}

export function estadoBadgeClass(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'libre')
    return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  if (e === 'ocupada')
    return 'bg-red-500/10 text-red-500 dark:text-red-400'
  if (e === 'reservada')
    return 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
  if (e === 'bloqueada')
    return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
  return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
}

export function estadoLabel(estado) {
  const e = String(estado || '').toLowerCase()
  if (e === 'libre') return 'Libre'
  if (e === 'ocupada') return 'Ocupada'
  if (e === 'reservada') return 'Reservada'
  if (e === 'bloqueada') return 'Bloqueada'
  return estado || '—'
}

export function formaLabel(forma) {
  const f = String(forma || '').toLowerCase()
  const o = FORMAS.find((x) => x.value === f)
  return o ? o.label : forma || '—'
}

export function zonaToFormValue(z) {
  const zl = normZona(z)
  const match = ZONAS.find((opt) => normZona(opt.value) === zl)
  return match ? match.value : 'interior'
}

export function formaToFormValue(forma) {
  const f = String(forma || '').toLowerCase()
  const match = FORMAS.find((opt) => opt.value === f)
  return match ? match.value : 'cuadrada'
}

export const emptyForm = () => ({
  numero: '',
  capacidad: 4,
  zona: 'interior',
  forma: 'cuadrada',
})
