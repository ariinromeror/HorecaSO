export function puestoPillClass(puesto) {
  const p = String(puesto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300/g, '')
  if (p === 'sala')
    return 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
  if (p === 'cocina')
    return 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
  if (p === 'barra')
    return 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
  if (p === 'almacen' || p === 'almacén')
    return 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
  return 'bg-[#e2e5ed]/40 text-[#374151] dark:bg-[#2e3347]/60 dark:text-[#9ca3af]'
}

export function mondayOfDate(ref) {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  x.setHours(0, 0, 0, 0)
  return x
}

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDM(d) {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

export function timeToHHMM(t) {
  if (t == null || t === '') return ''
  const s = String(t)
  if (s.includes('T')) return s.split('T')[1].slice(0, 5)
  return s.slice(0, 5)
}

export function displayHora(t) {
  const h = timeToHHMM(t)
  return h || '—'
}

export function normalizeAssignment(a) {
  return {
    empleado_id: String(a.empleado_id),
    fecha: String(a.fecha).slice(0, 10),
    hi: timeToHHMM(a.hora_inicio),
    hf: timeToHHMM(a.hora_fin),
    puesto: String(a.puesto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\u0300/g, ''),
  }
}

export function multisetDiffCount(baseline, current) {
  const key = (x) => JSON.stringify(x)
  const countMap = (arr) => {
    const m = new Map()
    for (const raw of arr) {
      const k = key(normalizeAssignment(raw))
      m.set(k, (m.get(k) || 0) + 1)
    }
    return m
  }
  const mb = countMap(baseline)
  const mc = countMap(current)
  const all = new Set([...mb.keys(), ...mc.keys()])
  let diff = 0
  for (const k of all) {
    diff += Math.abs((mb.get(k) || 0) - (mc.get(k) || 0))
  }
  return diff
}
