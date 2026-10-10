import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { unidadesPermitidasParaArticulo, etiquetaUnidad, unidadLineaPorDefecto } from '../recetasUtils'
import {
  downloadPlantillaIngredientesXlsx,
  isValidGridRow,
  newGridRow,
  normalizaTexto,
  parseIngredientesSpreadsheet,
  resolveImportRows,
  resolvedOkToGridRows,
  validRowsFromGrid,
} from '../ingredientesImportUtils'

const INPUT_SM =
  'w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-2 py-2 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN_SEC =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-sm font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN_PRIMARY =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 font-semibold text-black hover:bg-amber-600 disabled:opacity-40'

function ensureTrailingEmpty(rows) {
  const list = Array.isArray(rows) ? [...rows] : []
  const last = list[list.length - 1]
  if (!last || last.articulo_id || last.articulo_query || last.cantidad_neta) {
    list.push(newGridRow())
  }
  return list
}

/**
 * Tabla editable + import Excel/CSV.
 *
 * @param {object} props
 * @param {Array} props.articulos
 * @param {Array} props.rows
 * @param {(rows: Array) => void} props.onChange
 * @param {string[]} [props.excludeArticuloIds]
 * @param {'create'|'edit'} [props.mode]
 * @param {() => void|Promise<void>} [props.onSaveBulk] — solo mode=edit
 * @param {boolean} [props.saving]
 * @param {string} [props.error]
 */
export default function IngredientesGridEditor({
  articulos = [],
  rows,
  onChange,
  excludeArticuloIds = [],
  mode = 'create',
  onSaveBulk,
  saving = false,
  error = null,
}) {
  const fileRef = useRef(null)
  const [openSuggestKey, setOpenSuggestKey] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importResolved, setImportResolved] = useState([])
  const [importErr, setImportErr] = useState(null)
  const [importParsing, setImportParsing] = useState(false)

  const exclude = useMemo(
    () => new Set((excludeArticuloIds || []).map((id) => String(id))),
    [excludeArticuloIds]
  )

  const articulosPool = useMemo(
    () =>
      (articulos || []).filter((a) => !exclude.has(String(a.id))),
    [articulos, exclude]
  )

  const displayRows = useMemo(() => ensureTrailingEmpty(rows), [rows])

  useEffect(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      onChange([newGridRow()])
    }
    // solo al montar si vienen vacíos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRows = (next) => {
    onChange(ensureTrailingEmpty(next))
  }

  const updateRow = (key, patch) => {
    setRows(
      displayRows.map((r) => (r.key === key ? { ...r, ...patch } : r))
    )
  }

  const removeRow = (key) => {
    setRows(displayRows.filter((r) => r.key !== key))
  }

  const clearAll = () => {
    onChange([newGridRow()])
  }

  const selectArticulo = (key, art) => {
    const unidad = unidadLineaPorDefecto(art?.unidad_medida)
    updateRow(key, {
      articulo_id: art.id,
      articulo_query: art.nombre || '',
      articulo_nombre: art.nombre || '',
      unidad,
    })
    setOpenSuggestKey(null)
  }

  const suggestionsFor = (row) => {
    const q = normalizaTexto(row.articulo_query)
    if (!q || q.length < 1) return []
    const taken = new Set(
      displayRows
        .filter((r) => r.key !== row.key && r.articulo_id)
        .map((r) => String(r.articulo_id))
    )
    return articulosPool
      .filter((a) => {
        if (taken.has(String(a.id))) return false
        const n = normalizaTexto(a.nombre)
        const s = normalizaTexto(a.sku)
        return n.includes(q) || s.includes(q)
      })
      .slice(0, 12)
  }

  const onKeyDownRow = (e, row, field) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'cantidad_neta' || field === 'porcentaje_merma') {
        const idx = displayRows.findIndex((r) => r.key === row.key)
        if (idx === displayRows.length - 1) {
          setRows([...displayRows, newGridRow()])
        }
      }
    }
  }

  const existingIdsInGrid = displayRows
    .filter((r) => r.articulo_id)
    .map((r) => r.articulo_id)

  const handleFile = async (file) => {
    if (!file) return
    setImportParsing(true)
    setImportErr(null)
    try {
      const parsed = await parseIngredientesSpreadsheet(file)
      if (parsed.error) {
        setImportErr(parsed.error)
        setImportResolved([])
        setImportOpen(true)
        return
      }
      const resolved = resolveImportRows(
        parsed.rows,
        articulosPool,
        existingIdsInGrid
      )
      setImportResolved(resolved)
      setImportOpen(true)
    } catch (err) {
      setImportErr(err?.message || 'No se pudo leer el archivo')
      setImportResolved([])
      setImportOpen(true)
    } finally {
      setImportParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const applyImport = () => {
    const newRows = resolvedOkToGridRows(importResolved)
    if (!newRows.length) {
      setImportErr('No hay filas válidas para importar')
      return
    }
    const kept = displayRows.filter(
      (r) => r.articulo_id || r.cantidad_neta || (r.articulo_query && r.articulo_query.trim())
    )
    setRows([...kept, ...newRows])
    setImportOpen(false)
    setImportResolved([])
    setImportErr(null)
  }

  const validCount = validRowsFromGrid(displayRows).length
  const okImport = importResolved.filter((r) => r.status === 'ok').length

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
          Escribe filas como en Excel, o importa un archivo. Busca por nombre o
          SKU del inventario.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={BTN_SEC}
            onClick={downloadPlantillaIngredientesXlsx}
          >
            <Download size={16} strokeWidth={1.5} />
            Plantilla
          </button>
          <button
            type="button"
            className={BTN_SEC}
            disabled={importParsing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} strokeWidth={1.5} />
            {importParsing ? 'Leyendo…' : 'Importar Excel'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button type="button" className={BTN_SEC} onClick={clearAll}>
            Vaciar
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#e2e5ed] dark:border-[#2e3347]">
        <table className="horeca-body-text w-full min-w-[640px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-[#e2e5ed] bg-[#f0f2f5] dark:border-[#2e3347] dark:bg-[#222536]">
              <th className="px-2 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Artículo
              </th>
              <th className="w-28 px-2 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Cantidad
              </th>
              <th className="w-24 px-2 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Merma %
              </th>
              <th className="w-24 px-2 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Unidad
              </th>
              <th className="w-12 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const art = articulosPool.find(
                (a) => String(a.id) === String(row.articulo_id)
              )
              const choices = art
                ? unidadesPermitidasParaArticulo(art.unidad_medida)
                : []
              const sugg = openSuggestKey === row.key ? suggestionsFor(row) : []
              const valid = isValidGridRow(row)
              return (
                <tr
                  key={row.key}
                  className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                >
                  <td className="relative px-2 py-1.5 align-top">
                    <input
                      className={INPUT_SM}
                      value={row.articulo_query}
                      placeholder="Buscar nombre o SKU…"
                      onFocus={() => setOpenSuggestKey(row.key)}
                      onChange={(e) => {
                        updateRow(row.key, {
                          articulo_query: e.target.value,
                          articulo_id: '',
                          articulo_nombre: '',
                          unidad: '',
                        })
                        setOpenSuggestKey(row.key)
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setOpenSuggestKey((k) =>
                            k === row.key ? null : k
                          )
                        }, 150)
                      }}
                    />
                    {sugg.length > 0 ? (
                      <ul className="absolute z-20 mt-1 max-h-48 w-full min-w-[220px] overflow-y-auto rounded-lg border border-[#e2e5ed] bg-white shadow-lg dark:border-[#2e3347] dark:bg-[#1a1d27]">
                        {sugg.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-amber-500/15"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectArticulo(row.key, a)}
                            >
                              <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                                {a.nombre}
                              </span>
                              <span className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                                {a.sku ? `${a.sku} · ` : ''}
                                {etiquetaUnidad(
                                  unidadLineaPorDefecto(a.unidad_medida) ||
                                    a.unidad_medida
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {row.articulo_query && !row.articulo_id ? (
                      <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                        Elige un artículo de la lista
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={INPUT_SM}
                      value={row.cantidad_neta}
                      placeholder="0"
                      onChange={(e) =>
                        updateRow(row.key, { cantidad_neta: e.target.value })
                      }
                      onKeyDown={(e) =>
                        onKeyDownRow(e, row, 'cantidad_neta')
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.1"
                      className={INPUT_SM}
                      value={row.porcentaje_merma}
                      onChange={(e) =>
                        updateRow(row.key, {
                          porcentaje_merma: e.target.value,
                        })
                      }
                      onKeyDown={(e) =>
                        onKeyDownRow(e, row, 'porcentaje_merma')
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    {!row.articulo_id ? (
                      <div
                        className={`${INPUT_SM} flex items-center text-[#6b7280] dark:text-[#8b90a7]`}
                      >
                        —
                      </div>
                    ) : choices.length > 1 ? (
                      <select
                        className={INPUT_SM}
                        value={
                          choices.includes(row.unidad)
                            ? row.unidad
                            : choices[0]
                        }
                        onChange={(e) =>
                          updateRow(row.key, { unidad: e.target.value })
                        }
                      >
                        {choices.map((u) => (
                          <option key={u} value={u}>
                            {etiquetaUnidad(u)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={`${INPUT_SM} cursor-not-allowed opacity-90`}
                        readOnly
                        value={etiquetaUnidad(row.unidad || choices[0] || '')}
                      />
                    )}
                  </td>
                  <td className="px-1 py-1.5 align-top">
                    {(row.articulo_id ||
                      row.articulo_query ||
                      row.cantidad_neta) &&
                    !(
                      displayRows.length === 1 &&
                      !row.articulo_id &&
                      !row.cantidad_neta
                    ) ? (
                      <button
                        type="button"
                        className="rounded p-2 text-red-500 hover:bg-red-500/10"
                        aria-label="Quitar fila"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    ) : null}
                    {valid ? (
                      <span className="sr-only">fila válida</span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
        La unidad sale del Inventario. En líquidos puedes usar l o ml (ej. leche
        200 ml). En sólidos, kg o g.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={BTN_SEC}
          onClick={() => setRows([...displayRows, newGridRow()])}
        >
          <Plus size={16} strokeWidth={1.5} />
          Añadir fila
        </button>
        <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
          {validCount} línea{validCount === 1 ? '' : 's'} lista
          {validCount === 1 ? '' : 's'}
        </span>
        {mode === 'edit' && onSaveBulk ? (
          <button
            type="button"
            disabled={saving || validCount === 0}
            className={`ml-auto ${BTN_PRIMARY}`}
            onClick={() => onSaveBulk()}
          >
            <FileSpreadsheet size={18} strokeWidth={1.5} />
            {saving ? 'Guardando…' : 'Guardar líneas nuevas'}
          </button>
        ) : null}
      </div>

      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
            <div className="flex items-center justify-between border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]">
              <h3 className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
                Vista previa importación
              </h3>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
                onClick={() => setImportOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {importErr ? (
                <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                  {importErr}
                </p>
              ) : null}
              <p className="mb-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                {okImport} fila{okImport === 1 ? '' : 's'} listas para añadir
                {importResolved.length
                  ? ` · ${importResolved.length} leídas`
                  : ''}
              </p>
              {importResolved.length === 0 && !importErr ? (
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  No hay filas de datos en el archivo.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {importResolved.map((r) => (
                    <li
                      key={`${r.rowIndex}-${r.sku}-${r.nombre}`}
                      className={`rounded-lg border px-3 py-2 ${
                        r.status === 'ok'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : r.status === 'duplicate'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <span className="font-medium">
                        Fila {r.rowIndex}:{' '}
                        {r.articulo?.nombre || r.nombre || r.sku || '—'}
                      </span>
                      {r.status === 'ok' ? (
                        <span>
                          {' '}
                          · {r.cantidad_neta} {r.unidad} · merma{' '}
                          {r.porcentaje_merma}% · {r.message}
                        </span>
                      ) : (
                        <span> · {r.message}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]">
              <button
                type="button"
                className={BTN_SEC}
                onClick={() => setImportOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={BTN_PRIMARY}
                disabled={okImport === 0}
                onClick={applyImport}
              >
                Añadir {okImport} a la tabla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
