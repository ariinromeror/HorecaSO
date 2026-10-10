/** Todas las unidades posibles en formularios (se filtra por artículo). */
export const UNIDADES_OPTS = ['kg', 'g', 'l', 'ml', 'ud']

const VOLUMEN_ALIAS = new Set([
  'l',
  'lt',
  'litro',
  'litros',
  'litro(s)',
  'ml',
  'mililitro',
  'mililitros',
])
const MASA_ALIAS = new Set([
  'kg',
  'kilo',
  'kilos',
  'kilogramo',
  'kilogramos',
  'g',
  'gr',
  'gramo',
  'gramos',
  'gramo(s)',
])
const UNIDAD_ALIAS = new Set(['ud', 'unidad', 'unidades', 'u', 'uds'])

/** Canoniza sinónimos de inventario a kg|g|l|ml|ud. */
export function normalizarUnidad(u) {
  const x = String(u || '')
    .trim()
    .toLowerCase()
  if (!x) return ''
  if (x === 'ml' || x === 'mililitro' || x === 'mililitros') return 'ml'
  if (
    x === 'l' ||
    x === 'lt' ||
    x === 'litro' ||
    x === 'litros' ||
    x === 'litro(s)'
  )
    return 'l'
  if (
    x === 'g' ||
    x === 'gr' ||
    x === 'gramo' ||
    x === 'gramos' ||
    x === 'gramo(s)'
  )
    return 'g'
  if (
    x === 'kg' ||
    x === 'kilo' ||
    x === 'kilos' ||
    x === 'kilogramo' ||
    x === 'kilogramos'
  )
    return 'kg'
  if (UNIDAD_ALIAS.has(x)) return 'ud'
  return x
}

export function familiaUnidad(u) {
  const raw = String(u || '')
    .trim()
    .toLowerCase()
  const x = normalizarUnidad(u)
  if (x === 'kg' || x === 'g' || MASA_ALIAS.has(raw)) return 'masa'
  if (x === 'l' || x === 'ml' || VOLUMEN_ALIAS.has(raw)) return 'volumen'
  if (x === 'ud' || UNIDAD_ALIAS.has(raw)) return 'unidad'
  return 'desconocido'
}

/** Líquidos: l/ml. Sólidos peso: kg/g. Unidades sueltas: ud. */
export function unidadesPermitidasParaArticulo(unidadMedidaArticulo) {
  const fam = familiaUnidad(unidadMedidaArticulo)
  if (fam === 'volumen') return ['l', 'ml']
  if (fam === 'masa') return ['kg', 'g']
  if (fam === 'unidad') return ['ud']
  if (unidadMedidaArticulo && String(unidadMedidaArticulo).trim()) {
    const n = normalizarUnidad(unidadMedidaArticulo)
    return n ? [n] : [...UNIDADES_OPTS]
  }
  return [...UNIDADES_OPTS]
}

/** Unidad por defecto al elegir un artículo (respeta ml si el stock está en ml). */
export function unidadLineaPorDefecto(unidadMedidaArticulo) {
  const n = normalizarUnidad(unidadMedidaArticulo)
  const fam = familiaUnidad(unidadMedidaArticulo)
  if (fam === 'volumen') return n === 'ml' ? 'ml' : 'l'
  if (fam === 'masa') return n === 'g' ? 'g' : 'kg'
  if (fam === 'unidad') return 'ud'
  return n || ''
}

export function etiquetaUnidad(u) {
  const n = normalizarUnidad(u) || String(u || '').toLowerCase()
  const map = {
    l: 'l (litros)',
    ml: 'ml',
    kg: 'kg',
    g: 'g',
    ud: 'ud',
  }
  return map[n] || n || '—'
}

export function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

/** localStorage: % de coste sobre PVP objetivo (food cost). Editable por el usuario. */
export const LS_PCT_COSTE_VENTA = 'horecaso_pct_coste_venta_objetivo'

export function readPctCosteVenta() {
  try {
    const v = localStorage.getItem(LS_PCT_COSTE_VENTA)
    const n = Number(String(v).replace(',', '.'))
    if (Number.isFinite(n) && n > 0 && n < 100) return n
  } catch {
    /* ignore */
  }
  return 30
}

export function writePctCosteVenta(n) {
  const x = Number(String(n).replace(',', '.'))
  if (Number.isFinite(x) && x > 0 && x < 100) {
    localStorage.setItem(LS_PCT_COSTE_VENTA, String(x))
  }
}

/** PVP sugerido = coste / (pct/100), pct = % coste sobre venta deseado. */
export function precioVentaSugerido(coste, pctCosteSobreVenta) {
  const c = Number(coste)
  const p = Number(pctCosteSobreVenta)
  if (!Number.isFinite(c) || c <= 0) return null
  if (!Number.isFinite(p) || p <= 0 || p >= 100) return null
  return c / (p / 100)
}

export function cantidadBruta(neta, mermaPct) {
  const n = Number(neta) || 0
  const m = Number(mermaPct) || 0
  const den = 1 - m / 100
  if (den <= 0) return n
  return n / den
}

export function costeLineaIng(bruta, costeUnit) {
  return (Number(bruta) || 0) * (Number(costeUnit) || 0)
}
