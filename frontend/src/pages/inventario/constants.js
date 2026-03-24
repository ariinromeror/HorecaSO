export const INPUT =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
export const CARD_BASE =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl'
export const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
export const BTN_SECONDARY =
  'h-10 px-4 rounded-lg bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] text-[#111827] dark:text-[#e8eaf0] font-medium transition-colors inline-flex items-center justify-center gap-2'
export const BTN_DANGER =
  'h-10 px-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 font-medium transition-colors inline-flex items-center justify-center gap-2'

export const CATEGORIAS_ALMACEN = [
  { value: '', label: 'Todas' },
  { value: 'carnes', label: 'Carnes' },
  { value: 'pescados', label: 'Pescados' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'lácteos', label: 'Lácteos' },
  { value: 'verduras', label: 'Verduras' },
  { value: 'secos', label: 'Secos' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'otros', label: 'Otros' },
]

export const CATEGORIAS_FORM = CATEGORIAS_ALMACEN.filter((c) => c.value !== '')

export const UNIDADES = ['kg', 'g', 'l', 'ml', 'ud']

export const TEMP_OPTS = [
  { value: 'ambiente', label: 'Ambiente' },
  { value: 'refrigerado', label: 'Refrigerado' },
  { value: 'congelado', label: 'Congelado' },
]

export const TIPOS_MOV_FILTRO = [
  { value: '', label: 'Todos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'merma', label: 'Merma' },
  { value: 'ajuste', label: 'Ajuste' },
]

export const TIPOS_MOV_MODAL = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'merma', label: 'Merma' },
  { value: 'ajuste', label: 'Ajuste' },
]

export const ICON_PROPS = { strokeWidth: 1.5, className: 'shrink-0' }

export function formatEuro(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(n))
}

export function formatStock(n, unidad) {
  const x = Number(n)
  const s = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(x)
  return `${s} ${unidad || ''}`.trim()
}

export function tempBadgeClass(t) {
  if (t === 'refrigerado')
    return 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
  if (t === 'congelado')
    return 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
  return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
}

export function tipoMovBadgeClass(tipo) {
  switch (tipo) {
    case 'entrada':
      return 'bg-emerald-500/10 text-emerald-500'
    case 'salida':
      return 'bg-red-500/10 text-red-500'
    case 'merma':
      return 'bg-orange-500/10 text-orange-500'
    case 'ajuste':
      return 'bg-blue-500/10 text-blue-500'
    default:
      return 'bg-zinc-500/10 text-zinc-400'
  }
}

export function cantidadMovDisplay(row) {
  const u = row.unidad_medida || ''
  const c = Number(row.cantidad)
  const abs = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Math.abs(c))
  const suf = u ? ` ${u}` : ''
  if (row.tipo === 'entrada' || row.tipo === 'ajuste') {
    return { text: `+${abs}${suf}`, className: 'text-emerald-500 font-medium' }
  }
  return { text: `-${abs}${suf}`, className: 'text-red-500 font-medium' }
}

/** Movimientos list may not include unidad — join from articulosOpciones */
export function enrichMovimiento(m, articulosById) {
  const art = articulosById[m.articulo_id]
  return { ...m, unidad_medida: art?.unidad_medida || '' }
}

export function differsStock(inputVal, stockActual) {
  const a = Number(inputVal)
  const b = Number(stockActual)
  if (Number.isNaN(a)) return false
  return Math.abs(a - b) > 1e-6
}

export const emptyFormArticulo = () => ({
  nombre: '',
  sku: '',
  unidad_medida: 'kg',
  stock_minimo: '0.01',
  stock_maximo: '',
  coste_unitario: '',
  categoria_almacen: 'otros',
  temperatura_almacen: 'ambiente',
})
