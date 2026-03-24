export const ICON = { strokeWidth: 1.5, className: 'shrink-0' }

export function badgeComandaClass(alerta) {
  switch (alerta) {
    case 'critico':
      return 'bg-red-500/10 text-red-500 dark:text-red-400'
    case 'warning':
      return 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
    default:
      return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  }
}

export function badgeComandaLabel(alerta) {
  switch (alerta) {
    case 'critico':
      return 'Urgente'
    case 'warning':
      return 'Atención'
    default:
      return 'Al día'
  }
}

export function cardTopBorder(alerta) {
  switch (alerta) {
    case 'critico':
      return 'border-t-4 border-t-red-500'
    case 'warning':
      return 'border-t-4 border-t-amber-500'
    default:
      return 'border-t-4 border-t-emerald-500'
  }
}

export function cardBgClass(alerta) {
  if (alerta === 'critico') {
    return 'bg-red-500/5 dark:bg-red-500/5'
  }
  return 'bg-white dark:bg-[#1a1d27]'
}

export function lineaWaitClass(alerta) {
  switch (alerta) {
    case 'critico':
      return 'text-red-500 dark:text-red-400 font-bold'
    case 'warning':
      return 'text-amber-500 dark:text-amber-400'
    default:
      return 'text-emerald-500 dark:text-emerald-400'
  }
}

export function estadoBadgeClass(estado) {
  const e = (estado || 'pendiente').toLowerCase()
  if (e === 'preparando') {
    return 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
  }
  if (e === 'listo') {
    return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  }
  return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
}

export function estadoLabel(estado) {
  const e = (estado || 'pendiente').toLowerCase()
  if (e === 'preparando') return 'Preparando'
  if (e === 'listo') return 'Listo'
  if (e === 'servido') return 'Servido'
  return 'Pendiente'
}

export function minutosDesde(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.round((Date.now() - t) / 60000))
}

export function tituloKdsPorRol(rol) {
  const r = String(rol || '').toLowerCase()
  if (r === 'barra') return 'Barra KDS'
  if (r === 'cocina') return 'Cocina KDS'
  return 'KDS — Sala'
}
