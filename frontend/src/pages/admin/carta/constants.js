export const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
]

export const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
export const BTN_DANGER =
  'h-10 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors'
export const INPUT =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
export const CARD =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl'

export function labelDestinoKds(d) {
  const v = String(d || 'cocina').toLowerCase()
  if (v === 'barra') return 'Barra'
  if (v === 'ninguno') return 'Sin KDS'
  return 'Cocina'
}
