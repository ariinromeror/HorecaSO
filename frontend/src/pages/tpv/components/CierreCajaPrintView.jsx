/**
 * Vista imprimible térmica — cierre de caja (desglose + cerrado por).
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

function fmtEuro(n) {
  return `${(Number(n) || 0).toFixed(2)} €`
}

const METODOS = [
  { key: 'total_efectivo', label: 'Efectivo' },
  { key: 'total_tarjeta', label: 'Tarjeta' },
  { key: 'total_bizum', label: 'Bizum' },
  { key: 'total_transferencia', label: 'Transferencia' },
  { key: 'total_invitaciones', label: 'Invitaciones' },
]

export { METODOS }

export default function CierreCajaPrintView({
  data,
  tenantNombre,
  anchoMm = 80,
}) {
  if (!data) return null

  const ahora = new Date()
  const hora = ahora.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const fechaLabel = data.fecha
    ? (() => {
        const [y, m, d] = String(data.fecha).split('-')
        if (y && m && d) return `${d}/${m}/${y}`
        return data.fecha
      })()
    : '—'

  const tp = data.tenant_print || null
  const titulo = displayName(tp, tenantNombre)
  const nif = tp?.nif && String(tp.nif).trim()
  const direccion = tp?.direccion && String(tp.direccion).trim()
  const localidad = locLine(tp)
  const telefono = tp?.telefono && String(tp.telefono).trim()

  return (
    <div
      id="horecaso-print-root"
      className="ticket-print-root"
      data-ancho={anchoMm}
      aria-hidden="true"
    >
      <div className="ticket-print-inner">
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

        <p className="ticket-print-meta">CIERRE DE CAJA</p>
        <p className="ticket-print-meta">
          Fecha: {fechaLabel} · {hora.split(',').pop()?.trim() || hora}
        </p>
        <p className="ticket-print-mesa">
          Cerrado por: {data.cerrado_por_nombre || '—'}
        </p>
        <hr className="ticket-print-hr" />

        <ul className="ticket-print-lines">
          {METODOS.map(({ key, label }) => (
            <li key={key}>
              <span>{label}</span>
              <span>{fmtEuro(data[key])}</span>
            </li>
          ))}
        </ul>

        <hr className="ticket-print-hr" />
        <p className="ticket-print-total">
          TOTAL {fmtEuro(data.total_ventas)}
        </p>
        <p className="ticket-print-meta">
          Tickets: {data.num_tickets ?? 0} · Medio:{' '}
          {fmtEuro(data.ticket_medio)}
        </p>
        <hr className="ticket-print-hr" />
        <p className="ticket-print-powered">Powered by HorecaSO</p>
      </div>
    </div>
  )
}

/** Payload para printViaAgentOrBrowser (tipo cierre). */
export function buildCierrePrintPayload(data, tenantNombre) {
  if (!data) return null
  return {
    tipo: 'cierre',
    tenant: tenantNombre || 'HorecaSO',
    tenant_print: data.tenant_print || null,
    cerrado_por: data.cerrado_por_nombre || null,
    fecha: data.fecha || null,
    total: Number(data.total_ventas) || 0,
    num_tickets: data.num_tickets ?? 0,
    ticket_medio: Number(data.ticket_medio) || 0,
    lineas: METODOS.map(({ key, label }) => ({
      cantidad: 1,
      nombre: label,
      subtotal: Number(data[key]) || 0,
      nota: null,
    })),
  }
}
