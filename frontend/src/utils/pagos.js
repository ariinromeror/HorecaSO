/** Reparte total (€) en N partes en céntimos; el resto se reparte +1 cént. a las primeras partes. */
export function splitImporteEnNPartes(totalEuros, n) {
  const cents = Math.round(Number(totalEuros) * 100)
  if (n < 2 || cents <= 0) return []
  const base = Math.floor(cents / n)
  const rem = cents % n
  const out = []
  for (let i = 0; i < n; i++) {
    const c = base + (i < rem ? 1 : 0)
    out.push(c / 100)
  }
  return out
}
