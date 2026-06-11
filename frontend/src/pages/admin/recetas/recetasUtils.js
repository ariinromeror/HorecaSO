/** Todas las unidades posibles en formularios (se filtra por artículo). */
export const UNIDADES_OPTS = ['kg', 'g', 'l', 'ml', 'ud']

export function familiaUnidad(u) {
  const x = String(u || '')
    .trim()
    .toLowerCase()
  if (x === 'kg' || x === 'g') return 'masa'
  if (x === 'l' || x === 'ml') return 'volumen'
  if (x === 'ud' || x === 'unidad' || x === 'u') return 'unidad'
  return 'desconocido'
}

/** Líquidos: l/ml. Sólidos peso: kg/g. Unidades sueltas: ud. */
export function unidadesPermitidasParaArticulo(unidadMedidaArticulo) {
  const fam = familiaUnidad(unidadMedidaArticulo)
  if (fam === 'volumen') return ['l', 'ml']
  if (fam === 'masa') return ['kg', 'g']
  if (fam === 'unidad') return ['ud']
  if (unidadMedidaArticulo && String(unidadMedidaArticulo).trim()) {
    return [String(unidadMedidaArticulo).trim().toLowerCase()]
  }
  return [...UNIDADES_OPTS]
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
