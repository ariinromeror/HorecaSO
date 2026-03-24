export const ROLES_ACCESO = ['admin', 'director', 'jefe_sala']

export const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
export const TEXTAREA = `${INPUT} min-h-[88px] resize-y`
export const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
export const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
export const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
export const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'

/** Slugs alineados con etiquetado alérgenos UE (valores en TEXT[]). */
export const ALERGENOS = [
  { slug: 'gluten', label: 'Gluten' },
  { slug: 'crustaceos', label: 'Crustáceos', aliases: ['crustaceos'] },
  { slug: 'huevo', label: 'Huevo' },
  { slug: 'pescado', label: 'Pescado' },
  { slug: 'cacahuetes', label: 'Cacahuetes' },
  { slug: 'soja', label: 'Soja' },
  { slug: 'lacteos', label: 'Lácteos' },
  {
    slug: 'frutos_cascara',
    label: 'Frutos de cáscara',
    aliases: ['frutos de cascara', 'frutos_de_cascara'],
  },
  { slug: 'apio', label: 'Apio' },
  { slug: 'mostaza', label: 'Mostaza' },
  { slug: 'sesamo', label: 'Sésamo', aliases: ['sesamo'] },
  { slug: 'sulfitos', label: 'Sulfitos' },
  { slug: 'moluscos', label: 'Moluscos' },
  { slug: 'altramuces', label: 'Altramuces' },
]

export function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function slugFromApiValue(val) {
  const n = normKey(val)
  for (const a of ALERGENOS) {
    if (normKey(a.slug) === n) return a.slug
    if (normKey(a.label) === n) return a.slug
    for (const al of a.aliases || []) {
      if (normKey(al) === n) return a.slug
    }
  }
  return null
}

export function emptyAlergenosSet() {
  return new Set()
}

export function alergenosFromApi(arr) {
  const s = emptyAlergenosSet()
  for (const x of arr || []) {
    const sl = slugFromApiValue(x)
    if (sl) s.add(sl)
  }
  return s
}

export function alergenosToApi(set) {
  return ALERGENOS.filter((a) => set.has(a.slug)).map((a) => a.slug)
}

export function formatEuroFromApi(val) {
  if (val == null || val === '') return '0.00 €'
  const n = Number(val)
  if (Number.isNaN(n)) return `${String(val)} €`
  return `${n.toFixed(2)} €`
}

export function formatFechaHumana(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatFechaTicket(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function emptyFormCliente() {
  return {
    nombre: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    preferencias: '',
    notas: '',
    alergenos: emptyAlergenosSet(),
  }
}
