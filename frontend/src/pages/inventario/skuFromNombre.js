/**
 * Genera SKU abreviado desde el nombre del artículo.
 * Letras del nombre; dígitos del nombre si existen; unicidad con -2, -3.
 */

const STOP = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'y',
  'a',
  'en',
  'con',
  'para',
  'un',
  'una',
  'unos',
  'unas',
  'al',
  'por',
])

const VOCALES = new Set(['a', 'e', 'i', 'o', 'u'])

function sinAcentos(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function soloLetras(s) {
  return sinAcentos(s).replace(/[^a-z]/g, '')
}

function consonantes(s) {
  return [...soloLetras(s)].filter((c) => !VOCALES.has(c)).join('')
}

function palabrasSignificativas(nombre) {
  return sinAcentos(nombre)
    .split(/[\s/_,.;:+\-()]+/)
    .map((w) => w.trim())
    .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w))
}

function digitosDelNombre(nombre) {
  const m = String(nombre || '').match(/\d+/g)
  if (!m) return ''
  return m.join('').slice(0, 3)
}

/**
 * Abreviatura base en mayúsculas (sin sufijo de unicidad).
 * leche → LCH; leche de almendras → LCHA; aceite 5L → …5
 */
export function sugerirSkuBase(nombre) {
  const words = palabrasSignificativas(nombre)
  const digits = digitosDelNombre(nombre)
  if (!words.length) {
    return digits ? `ART${digits}` : ''
  }

  let base = ''
  if (words.length === 1) {
    const w = words[0]
    const cons = consonantes(w)
    if (cons.length >= 2) {
      base = cons.slice(0, 4)
    } else {
      base = soloLetras(w).slice(0, 3)
    }
  } else {
    const first = words[0]
    const cons = consonantes(first)
    const head =
      cons.length >= 2
        ? cons.slice(0, 3)
        : soloLetras(first).slice(0, 3)
    const rest = words
      .slice(1)
      .map((w) => soloLetras(w).charAt(0))
      .join('')
    base = (head + rest).slice(0, 6)
  }

  if (!base) base = 'ART'
  base = base.toUpperCase() + digits
  return base.replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'ART'
}

/**
 * @param {string} base
 * @param {string[]} existentesSkus — SKUs ya usados (mismo tenant)
 * @param {string|null} [excluirSku] — al editar, no contar el propio
 */
export function skuUnico(base, existentesSkus = [], excluirSku = null) {
  let b = String(base || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!b) b = 'ART'

  const taken = new Set(
    (existentesSkus || [])
      .map((s) =>
        String(s || '')
          .trim()
          .toUpperCase()
      )
      .filter(Boolean)
  )
  const excl = excluirSku
    ? String(excluirSku).trim().toUpperCase()
    : null
  if (excl) taken.delete(excl)

  if (!taken.has(b)) return b
  for (let i = 2; i < 1000; i++) {
    const cand = `${b}-${i}`
    if (!taken.has(cand)) return cand
  }
  return `${b}-${Date.now().toString(36).toUpperCase()}`
}

export function sugerirSku(nombre, existentesSkus = [], excluirSku = null) {
  return skuUnico(sugerirSkuBase(nombre), existentesSkus, excluirSku)
}
