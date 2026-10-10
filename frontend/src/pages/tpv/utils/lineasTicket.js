export function agruparLineasTicket(lineas) {
  const map = new Map()
  for (const ln of lineas || []) {
    const notaKey = (ln.nota || '').trim()
    const key = `${String(ln.producto_id)}::${notaKey}`
    if (!map.has(key)) {
      map.set(key, {
        producto_id: ln.producto_id,
        cantidad: 0,
        subtotal: 0,
        nota: notaKey || null,
        linea_ids: [],
        destino_kds: ln.destino_kds || 'ninguno',
        enviado_cocina: !!ln.enviado_cocina,
        enviado_barra: !!ln.enviado_barra,
        estado_cocina: ln.estado_cocina || 'pendiente',
        estado_barra: ln.estado_barra || 'pendiente',
      })
    }
    const g = map.get(key)
    g.cantidad += Number(ln.cantidad) || 0
    g.subtotal += Number(ln.subtotal) || 0
    if (ln.id) g.linea_ids.push(ln.id)
    if (ln.enviado_cocina) g.enviado_cocina = true
    if (ln.enviado_barra) g.enviado_barra = true
    if (ln.destino_kds && ln.destino_kds !== 'ninguno') {
      g.destino_kds = ln.destino_kds
    }
    if (ln.estado_cocina) g.estado_cocina = ln.estado_cocina
    if (ln.estado_barra) g.estado_barra = ln.estado_barra
  }
  return Array.from(map.values())
}

export function totalUnidadesLineas(lineas) {
  return (lineas || []).reduce(
    (s, ln) => s + (Number(ln.cantidad) || 0),
    0
  )
}
