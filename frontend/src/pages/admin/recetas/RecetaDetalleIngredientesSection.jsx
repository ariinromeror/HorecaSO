import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, RefreshCw, Trash2 } from 'lucide-react'
import {
  cantidadBruta,
  costeLineaIng,
  formatEuro,
} from './recetasUtils'
import IngredientesGridEditor from './components/IngredientesGridEditor'
import {
  newGridRow,
  validRowsFromGrid,
} from './ingredientesImportUtils'

const INPUT_SM =
  'w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-2 py-2 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN_DANGER =
  'h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm transition-colors'
const BTN_SAVE =
  'inline-flex h-9 items-center gap-1 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-black hover:bg-amber-600 disabled:opacity-40'

const TIP_MERMA =
  'Pérdida al limpiar o cocinar (ej. 10). Sube un poco el coste. Déjalo en 0 si no aplica.'

function draftFromIng(ing) {
  return {
    cantidad_neta: String(ing.cantidad_neta ?? ''),
    porcentaje_merma: String(ing.porcentaje_merma ?? 0),
  }
}

export default function RecetaDetalleIngredientesSection({
  recetaDetalle,
  articulos,
  onReloadCoste,
  onBulkAddIngredientes,
  onUpdateIngrediente,
  onDeleteIngrediente,
  savingBulk = false,
  savingIngredienteId,
}) {
  const salidaId = recetaDetalle?.articulo_salida_id
  const [gridRows, setGridRows] = useState(() => [newGridRow()])
  const [drafts, setDrafts] = useState({})
  const [bulkErr, setBulkErr] = useState(null)

  useEffect(() => {
    const next = {}
    for (const ing of recetaDetalle?.ingredientes || []) {
      next[ing.id] = draftFromIng(ing)
    }
    setDrafts(next)
  }, [recetaDetalle])

  const excludeIds = useMemo(() => {
    const ids = []
    if (salidaId) ids.push(String(salidaId))
    for (const ing of recetaDetalle?.ingredientes || []) {
      if (ing.articulo_id) ids.push(String(ing.articulo_id))
    }
    return ids
  }, [salidaId, recetaDetalle])

  const costeUnitParaLinea = (ing) =>
    ing.coste_unitario_efectivo ?? ing.coste_unitario

  const totalIng = (recetaDetalle.ingredientes || []).reduce((acc, ing) => {
    if (ing.coste_linea != null) return acc + Number(ing.coste_linea)
    const bruta =
      ing.cantidad_bruta ??
      cantidadBruta(ing.cantidad_neta, ing.porcentaje_merma)
    return acc + costeLineaIng(bruta, costeUnitParaLinea(ing))
  }, 0)

  const setDraftField = (ingId, field, value) => {
    setDrafts((d) => {
      const prev = d[ingId] || {
        cantidad_neta: '',
        porcentaje_merma: '0',
      }
      return { ...d, [ingId]: { ...prev, [field]: value } }
    })
  }

  const isDirty = (ing) => {
    const d = drafts[ing.id] || draftFromIng(ing)
    return (
      String(d.cantidad_neta) !== String(ing.cantidad_neta ?? '') ||
      String(d.porcentaje_merma) !== String(ing.porcentaje_merma ?? 0)
    )
  }

  const handleSaveBulk = async () => {
    setBulkErr(null)
    const lineas = validRowsFromGrid(gridRows)
    if (!lineas.length) {
      setBulkErr('Añade al menos una línea válida (artículo + cantidad)')
      return
    }
    if (!onBulkAddIngredientes) return
    try {
      await onBulkAddIngredientes(lineas)
      setGridRows([newGridRow()])
    } catch (e) {
      setBulkErr(
        e?.response?.data?.detail ||
          e?.message ||
          'No se pudieron guardar los ingredientes'
      )
    }
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <BookOpen size={20} strokeWidth={1.5} className="text-amber-500" />
        <h3 className="text-lg font-semibold">Coste de esta receta</h3>
        <button
          type="button"
          onClick={() => onReloadCoste(recetaDetalle.receta_id)}
          className="ml-auto rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
          title="Actualizar costes desde inventario"
        >
          <RefreshCw size={18} strokeWidth={1.5} />
        </button>
      </div>
      <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        Indica cuánto echas de cada artículo del inventario (ej. 50 g de azúcar).
        El precio de compra del almacén calcula el coste solo.
      </p>

      <div className="mb-6 overflow-x-auto rounded-xl border border-[#e2e5ed] dark:border-[#2e3347]">
        <table className="horeca-body-text w-full min-w-[720px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-[#e2e5ed] bg-[#f0f2f5] dark:border-[#2e3347] dark:bg-[#222536]">
              <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Artículo
              </th>
              <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Cantidad
              </th>
              <th
                className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                title={TIP_MERMA}
              >
                Merma %
              </th>
              <th
                className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                title="Coste de esta línea según precio del artículo en inventario."
              >
                Coste línea
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(recetaDetalle.ingredientes || []).length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Aún no hay ingredientes. Usa la tabla de abajo o importa un
                  Excel.
                </td>
              </tr>
            ) : (
              (recetaDetalle.ingredientes || []).map((ing) => {
                const bruta =
                  ing.cantidad_bruta ??
                  cantidadBruta(ing.cantidad_neta, ing.porcentaje_merma)
                const cLine =
                  ing.coste_linea != null
                    ? Number(ing.coste_linea)
                    : costeLineaIng(bruta, costeUnitParaLinea(ing))
                const esSub = ing.es_subreceta === true
                const d = drafts[ing.id] || draftFromIng(ing)
                const dirty = isDirty(ing)
                const saving = savingIngredienteId === ing.id
                return (
                  <tr
                    key={ing.id}
                    className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                  >
                    <td className="px-3 py-2">
                      <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {ing.articulo_nombre || '—'}
                      </span>
                      {esSub ? (
                        <span className="ml-2 text-xs text-sky-600 dark:text-sky-400">
                          sub-receta
                        </span>
                      ) : null}
                      <div className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                        {ing.unidad || ''}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className={INPUT_SM}
                        value={d.cantidad_neta}
                        onChange={(e) =>
                          setDraftField(ing.id, 'cantidad_neta', e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="99.99"
                        className={INPUT_SM}
                        value={d.porcentaje_merma}
                        title={TIP_MERMA}
                        onChange={(e) =>
                          setDraftField(
                            ing.id,
                            'porcentaje_merma',
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-amber-600 dark:text-amber-400">
                      {formatEuro(cLine)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {dirty ? (
                          <button
                            type="button"
                            disabled={saving}
                            className={BTN_SAVE}
                            onClick={() =>
                              onUpdateIngrediente(ing.id, {
                                cantidad_neta: d.cantidad_neta,
                                porcentaje_merma: d.porcentaje_merma,
                              })
                            }
                          >
                            <Check size={16} strokeWidth={1.5} />
                            {saving ? '…' : 'Guardar'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={BTN_DANGER}
                          onClick={() => onDeleteIngrediente(ing.id)}
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#f0f2f5] font-bold dark:bg-[#222536]">
              <td
                colSpan={3}
                className="px-3 py-3 text-[#111827] dark:text-[#e8eaf0]"
              >
                Coste total de la receta
              </td>
              <td className="px-3 py-3 text-amber-600 dark:text-amber-500">
                {formatEuro(totalIng)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mb-6 rounded-xl border border-[#e2e5ed] p-4 dark:border-[#2e3347]">
        <h4 className="mb-3 text-[15px] font-semibold">
          Añadir ingredientes (tabla o Excel)
        </h4>
        <IngredientesGridEditor
          articulos={articulos}
          rows={gridRows}
          onChange={setGridRows}
          excludeArticuloIds={excludeIds}
          mode="edit"
          saving={savingBulk}
          error={bulkErr}
          onSaveBulk={handleSaveBulk}
        />
      </div>
    </>
  )
}
