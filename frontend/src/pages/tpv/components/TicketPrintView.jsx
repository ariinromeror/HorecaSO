/**
 * Vista imprimible térmica 58/80 mm (Epson vía driver Windows + window.print).
 * type: 'comanda' | 'ticket'
 */
function locLine(tp) {
  if (!tp) return null
  const bits = []
  if (tp.codigo_postal) bits.push(String(tp.codigo_postal).trim())
  if (tp.ciudad) bits.push(String(tp.ciudad).trim())
  if (tp.provincia) bits.push(`(${String(tp.provincia).trim()})`)
  const s = bits.join(' ').trim()
  return s || null
}

function displayName(tp, fallback) {
  const rs = tp?.razon_social && String(tp.razon_social).trim()
  const nom = tp?.nombre && String(tp.nombre).trim()
  return rs || nom || fallback || 'HorecaSO'
}

export default function TicketPrintView({
  type = 'ticket',
  mesaLabel,
  lineas = [],
  productoNombrePorId,
  total,
  qrUrl,
  tenantNombre,
  tenantPrint,
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
  const isTicket = type === 'ticket'
  const titulo = displayName(tenantPrint, tenantNombre)
  const nif = tenantPrint?.nif && String(tenantPrint.nif).trim()
  const direccion =
    tenantPrint?.direccion && String(tenantPrint.direccion).trim()
  const localidad = locLine(tenantPrint)
  const telefono =
    tenantPrint?.telefono && String(tenantPrint.telefono).trim()

  return (
    <div
      id="horecaso-print-root"
      className="ticket-print-root"
      data-ancho={anchoMm}
      aria-hidden="true"
    >
      <div className="ticket-print-inner">
        {isTicket ? (
          <div className="ticket-print-header-fiscal">
            <p className="ticket-print-brand">{titulo}</p>
            {nif ? <p className="ticket-print-fiscal">NIF {nif}</p> : null}
            {direccion ? (
              <p className="ticket-print-fiscal">{direccion}</p>
            ) : null}
            {localidad ? (
              <p className="ticket-print-fiscal">{localidad}</p>
            ) : null}
            {telefono ? (
              <p className="ticket-print-fiscal">Tel. {telefono}</p>
            ) : null}
          </div>
        ) : (
          <p className="ticket-print-brand">{titulo}</p>
        )}

        <p className="ticket-print-meta">
          {isTicket ? 'TICKET' : 'COMANDA'} · {hora}
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
                {isTicket ? <span>{sub.toFixed(2)} €</span> : null}
                {!isTicket && ln.nota ? (
                  <span className="ticket-print-nota">Nota: {ln.nota}</span>
                ) : null}
              </li>
            )
          })}
        </ul>
        {isTicket ? (
          <>
            <hr className="ticket-print-hr" />
            <p className="ticket-print-total">
              TOTAL {(Number(total) || 0).toFixed(2)} €
            </p>
            {numeroSerie ? (
              <p className="ticket-print-meta">Serie {numeroSerie}</p>
            ) : null}
            <hr className="ticket-print-hr" />
            <p className="ticket-print-thanks">¡Gracias por su compra!</p>
            <p className="ticket-print-soft">Le esperamos pronto</p>
            <p className="ticket-print-powered">Powered by HorecaSO</p>
          </>
        ) : (
          <>
            <hr className="ticket-print-hr" />
            <p className="ticket-print-powered">HorecaSO</p>
          </>
        )}
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
