export const STORAGE_FICHAR_LOGIN = 'horecaso_fichar_al_login'
export const STORAGE_PREFIX = 'horecaso_fichaje_activo_'

export function readFicharAlLogin() {
  try {
    return localStorage.getItem(STORAGE_FICHAR_LOGIN) !== '0'
  } catch {
    return true
  }
}

export function writeFicharAlLogin(v) {
  try {
    localStorage.setItem(STORAGE_FICHAR_LOGIN, v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function hoyLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fechaTurnoISO(t) {
  if (!t?.fecha) return ''
  return String(t.fecha).slice(0, 10)
}

export function parseHoraToToday(horaStr, fechaBase) {
  if (!horaStr) return null
  const part = String(horaStr).slice(0, 8)
  const [hh, mm, ss] = part.split(':').map((x) => parseInt(x, 10) || 0)
  const [y, mo, d] = fechaBase.split('-').map((x) => parseInt(x, 10))
  return new Date(y, mo - 1, d, hh, mm, ss || 0)
}

export function formatHora(isoOrTime) {
  if (!isoOrTime) return '—'
  const s = String(isoOrTime)
  if (s.length >= 8 && s.includes(':')) {
    const t = s.includes('T') ? s.split('T')[1] : s
    return t.slice(0, 5)
  }
  try {
    return new Date(s).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatHoras(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(2)} h`
}

export function readFichajeStorage(empleadoId) {
  if (!empleadoId) return null
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${empleadoId}`)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (o.fecha !== hoyLocalISO()) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${empleadoId}`)
      return null
    }
    return o
  } catch {
    return null
  }
}

export function writeFichajeStorage(empleadoId, payload) {
  sessionStorage.setItem(
    `${STORAGE_PREFIX}${empleadoId}`,
    JSON.stringify(payload)
  )
}

export function clearFichajeStorage(empleadoId) {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${empleadoId}`)
}
