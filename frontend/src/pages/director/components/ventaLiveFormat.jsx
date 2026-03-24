export function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

export const METODO_LABEL = {
  efectivo: 'Efectivo',
  tarjeta_credito: 'Tarjeta crédito',
  tarjeta_debito: 'Tarjeta débito',
  bizum: 'Bizum',
  transferencia: 'Transferencia',
  invitacion: 'Invitación',
  mixto: 'Mixto',
}

export function metodoEtiqueta(mp) {
  if (!mp) return '—'
  return METODO_LABEL[mp] || mp
}

export function horaDesdeIso(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '—'
  }
}

export function fechaHoraDesdeIso(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '—'
  }
}

export function ticketIdCorto(id) {
  if (!id) return '—'
  const s = String(id).replace(/-/g, '')
  return s.slice(-8).toUpperCase()
}

export function EstadoBadge({ estado }) {
  const e = String(estado || '').toLowerCase()
  if (e === 'abierto') {
    return (
      <span className="inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
        Abierto
      </span>
    )
  }
  if (e === 'cobrado') {
    return (
      <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
        Cobrado
      </span>
    )
  }
  if (e === 'anulado') {
    return (
      <span className="inline-flex rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
        Anulado
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-md bg-[#e2e5ed] px-2 py-0.5 text-xs font-semibold text-[#6b7280] dark:bg-[#2e3347] dark:text-[#9ca3af]">
      {estado || '—'}
    </span>
  )
}

export function MetodoBadgeTabla({ metodoPago }) {
  if (metodoPago == null) {
    return <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">—</span>
  }
  if (String(metodoPago).toLowerCase() === 'mixto') {
    return (
      <span className="inline-flex rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
        Dividido
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-md border border-[#e2e5ed] bg-[#f0f2f5] px-2 py-0.5 text-[11px] font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]">
      {metodoEtiqueta(metodoPago)}
    </span>
  )
}
