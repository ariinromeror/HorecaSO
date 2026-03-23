export const UNIDADES_OPTS = ['kg', 'g', 'l', 'ml', 'ud']

export function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
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
