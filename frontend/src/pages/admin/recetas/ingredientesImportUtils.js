import * as XLSX from 'xlsx'
import { unidadesPermitidasParaArticulo, unidadLineaPorDefecto } from './recetasUtils'

/** Quita acentos / mayúsculas para emparejar nombres. */
export function normalizaTexto(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function newGridRow(partial = {}) {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    articulo_id: '',
    articulo_query: '',
    cantidad_neta: '',
    porcentaje_merma: '0',
    unidad: '',
    ...partial,
  }
}

export function rowToPayload(row) {
  const neta = Number(String(row.cantidad_neta).replace(',', '.'))
  const merma = Number(String(row.porcentaje_merma ?? '0').replace(',', '.'))
  return {
    articulo_id: row.articulo_id,
    cantidad_neta: neta,
    porcentaje_merma: Number.isFinite(merma) ? merma : 0,
    unidad: row.unidad || 'kg',
    articulo_nombre: row.articulo_nombre || row.articulo_query || '',
  }
}

export function isValidGridRow(row) {
  if (!row?.articulo_id) return false
  const neta = Number(String(row.cantidad_neta).replace(',', '.'))
  if (!Number.isFinite(neta) || neta <= 0) return false
  const merma = Number(String(row.porcentaje_merma ?? '0').replace(',', '.'))
  if (!Number.isFinite(merma) || merma < 0 || merma >= 100) return false
  return true
}

export function validRowsFromGrid(rows) {
  return (rows || []).filter(isValidGridRow).map(rowToPayload)
}

function buildArticuloIndexes(articulos) {
  const bySku = new Map()
  const byNombre = new Map()
  for (const a of articulos || []) {
    const sku = String(a.sku || '')
      .trim()
      .toLowerCase()
    if (sku) bySku.set(sku, a)
    const n = normalizaTexto(a.nombre)
    if (n && !byNombre.has(n)) byNombre.set(n, a)
  }
  return { bySku, byNombre }
}

/**
 * Empareja una fila de importación con el inventario.
 * Prioridad: SKU exacto → nombre normalizado.
 */
export function matchArticulo(articulos, { sku, nombre }) {
  const { bySku, byNombre } = buildArticuloIndexes(articulos)
  const skuKey = String(sku || '')
    .trim()
    .toLowerCase()
  if (skuKey && bySku.has(skuKey)) {
    return { articulo: bySku.get(skuKey), match: 'sku' }
  }
  const n = normalizaTexto(nombre)
  if (n && byNombre.has(n)) {
    return { articulo: byNombre.get(n), match: 'nombre' }
  }
  return { articulo: null, match: null }
}

const HEADER_ALIASES = {
  sku: ['sku', 'codigo', 'código', 'cod', 'ref', 'referencia'],
  nombre: [
    'nombre',
    'articulo',
    'artículo',
    'producto',
    'ingrediente',
    'materia',
    'item',
  ],
  cantidad: ['cantidad', 'cantidad_neta', 'qty', 'cantidad neta', 'neto'],
  merma: ['merma', 'porcentaje_merma', 'merma_%', 'merma %', '% merma', 'pct_merma'],
  unidad: ['unidad', 'ud', 'u', 'unit', 'unidad_medida'],
}

function mapHeader(cell) {
  const n = normalizaTexto(cell).replace(/\s+/g, ' ')
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => normalizaTexto(a) === n)) return key
  }
  return null
}

function cellStr(v) {
  if (v == null || v === '') return ''
  return String(v).trim()
}

/**
 * Parsea ArrayBuffer / File de xlsx, xls o csv → filas crudas.
 */
export async function parseIngredientesSpreadsheet(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return { headers: {}, rows: [], error: 'El archivo no tiene hojas' }
  const sheet = wb.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })
  if (!aoa.length) return { headers: {}, rows: [], error: 'Hoja vacía' }

  const headerRow = aoa[0].map((c) => cellStr(c))
  const colMap = {}
  headerRow.forEach((h, i) => {
    const key = mapHeader(h)
    if (key && colMap[key] == null) colMap[key] = i
  })

  if (colMap.nombre == null && colMap.sku == null) {
    return {
      headers: colMap,
      rows: [],
      error:
        'Falta columna de nombre o SKU. Usa cabeceras: nombre, sku, cantidad, merma, unidad',
    }
  }
  if (colMap.cantidad == null) {
    return {
      headers: colMap,
      rows: [],
      error: 'Falta columna cantidad (o cantidad_neta)',
    }
  }

  const rows = []
  for (let r = 1; r < aoa.length; r++) {
    const line = aoa[r] || []
    const sku = colMap.sku != null ? cellStr(line[colMap.sku]) : ''
    const nombre = colMap.nombre != null ? cellStr(line[colMap.nombre]) : ''
    const cantidad = colMap.cantidad != null ? cellStr(line[colMap.cantidad]) : ''
    const merma =
      colMap.merma != null ? cellStr(line[colMap.merma]) : '0'
    const unidad =
      colMap.unidad != null ? cellStr(line[colMap.unidad]) : ''
    if (!sku && !nombre && !cantidad) continue
    rows.push({
      rowIndex: r + 1,
      sku,
      nombre,
      cantidad,
      merma: merma || '0',
      unidad,
    })
  }
  return { headers: colMap, rows, error: null }
}

/**
 * Resuelve filas parseadas contra inventario.
 * status: ok | not_found | invalid_qty | duplicate
 */
export function resolveImportRows(rawRows, articulos, existingArticuloIds = []) {
  const seen = new Set(
    (existingArticuloIds || []).map((id) => String(id))
  )
  const resolved = []

  for (const raw of rawRows) {
    const neta = Number(String(raw.cantidad).replace(',', '.'))
    const merma = Number(String(raw.merma ?? '0').replace(',', '.'))
    const { articulo, match } = matchArticulo(articulos, {
      sku: raw.sku,
      nombre: raw.nombre,
    })

    if (!articulo) {
      resolved.push({
        ...raw,
        status: 'not_found',
        message: 'No hay artículo en inventario con ese SKU/nombre',
      })
      continue
    }
    if (!Number.isFinite(neta) || neta <= 0) {
      resolved.push({
        ...raw,
        status: 'invalid_qty',
        message: 'Cantidad no válida',
        articulo,
        match,
      })
      continue
    }
    if (!Number.isFinite(merma) || merma < 0 || merma >= 100) {
      resolved.push({
        ...raw,
        status: 'invalid_qty',
        message: 'Merma debe estar entre 0 y 99.99',
        articulo,
        match,
      })
      continue
    }

    const artId = String(articulo.id)
    if (seen.has(artId)) {
      resolved.push({
        ...raw,
        status: 'duplicate',
        message: 'Artículo ya en la lista (se omitirá)',
        articulo,
        match,
        cantidad_neta: neta,
        porcentaje_merma: merma,
      })
      continue
    }
    seen.add(artId)

    const um = unidadLineaPorDefecto(articulo.unidad_medida)
    const permitidas = unidadesPermitidasParaArticulo(articulo.unidad_medida)
    let unidad = String(raw.unidad || um).trim().toLowerCase()
    if (!permitidas.includes(unidad)) unidad = um || permitidas[0] || 'kg'

    resolved.push({
      ...raw,
      status: 'ok',
      message: match === 'sku' ? 'Por SKU' : 'Por nombre',
      articulo,
      match,
      articulo_id: artId,
      cantidad_neta: neta,
      porcentaje_merma: merma,
      unidad,
      articulo_nombre: articulo.nombre,
    })
  }
  return resolved
}

export function resolvedOkToGridRows(resolved) {
  return resolved
    .filter((r) => r.status === 'ok')
    .map((r) =>
      newGridRow({
        articulo_id: r.articulo_id,
        articulo_query: r.articulo_nombre,
        articulo_nombre: r.articulo_nombre,
        cantidad_neta: String(r.cantidad_neta),
        porcentaje_merma: String(r.porcentaje_merma ?? 0),
        unidad: r.unidad,
      })
    )
}

/** Plantilla Excel real (.xlsx) — cabeceras fijas que reconoce el import. */
export function downloadPlantillaIngredientesXlsx() {
  const aoa = [
    ['nombre', 'sku', 'cantidad', 'merma', 'unidad'],
    ['Azúcar', '', 0.05, 0, 'kg'],
    ['Aceite oliva virgen extra 5L', 'ALM-AOV-5L', 0.02, 0, 'l'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ingredientes')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_ingredientes_receta.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
