/**
 * Vista imprimible térmica 58/80 mm (Epson vía driver Windows + window.print).
 * type: 'comanda' | 'ticket'
 */
export default function TicketPrintView({
  type = 'ticket',
  mesaLabel,
  lineas = [],
  productoNombrePorId,
  total,
  qrUrl,
  tenantNombre,
  numeroSerie,
  anchoMm = 80,
}) {
  const ahora = new Date()
  const hora = ahora.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      id="horecaso-print-root"
      className="ticket-print-root"
      data-ancho={anchoMm}
      aria-hidden="true"
    >
      <div className="ticket-print-inner">
        <p className="ticket-print-brand">{tenantNombre || 'HorecaSO'}</p>
        <p className="ticket-print-meta">
          {type === 'comanda' ? 'COMANDA' : 'TICKET'} · {hora}
        </p>
        {mesaLabel ? (
          <p className="ticket-print-mesa">Mesa {mesaLabel}</p>
        ) : null}
        <hr className="ticket-print-hr" />
        <ul className="ticket-print-lines">
          {lineas.map((ln) => {
            const nombre =
              productoNombrePorId?.get?.(String(ln.producto_id)) ||
              ln.nombre ||
              'Producto'
            const qty = Number(ln.cantidad) || 0
            const sub = Number(ln.subtotal) || 0
            return (
              <li key={ln.id || `${ln.producto_id}-${qty}`}>
                <span>
                  {qty}× {nombre}
                </span>
                {type === 'ticket' ? (
                  <span>{sub.toFixed(2)} €</span>
                ) : null}
                {ln.nota ? (
                  <span className="ticket-print-nota">Nota: {ln.nota}</span>
                ) : null}
              </li>
            )
          })}
        </ul>
        {type === 'ticket' ? (
          <>
            <hr className="ticket-print-hr" />
            <p className="ticket-print-total">
              TOTAL {(Number(total) || 0).toFixed(2)} €
            </p>
            {numeroSerie ? (
              <p className="ticket-print-meta">Serie {numeroSerie}</p>
            ) : null}
            {qrUrl ? (
              <p className="ticket-print-qr">
                QR Verifactu:
                <br />
                {qrUrl}
              </p>
            ) : null}
          </>
        ) : null}
        <p className="ticket-print-foot">Gracias</p>
      </div>
    </div>
  )
}

export function printTicketThermal() {
  window.print()
}

/** Intenta Print Agent local; si no hay, window.print (Camino 1). */
export async function printViaAgentOrBrowser(payload) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 800)
    const r = await fetch('http://127.0.0.1:9173/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (r.ok) return { via: 'agent' }
  } catch {
    /* sin agente → navegador */
  }
  window.print()
  return { via: 'browser' }
}
