export function agruparLineasTicket(lineas) {
  const map = new Map()
  for (const ln of lineas || []) {
    const key = String(ln.producto_id)
    if (!map.has(key)) {
      map.set(key, {
        producto_id: ln.producto_id,
        cantidad: 0,
        subtotal: 0,
      })
    }
    const g = map.get(key)
    g.cantidad += Number(ln.cantidad) || 0
    g.subtotal += Number(ln.subtotal) || 0
  }
  return Array.from(map.values())
}

export function totalUnidadesLineas(lineas) {
  return (lineas || []).reduce(
    (s, ln) => s + (Number(ln.cantidad) || 0),
    0
  )
}
