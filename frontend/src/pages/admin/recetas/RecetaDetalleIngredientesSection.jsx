import { BookOpen, RefreshCw, Trash2 } from 'lucide-react'
import {
  UNIDADES_OPTS,
  cantidadBruta,
  costeLineaIng,
  formatEuro,
} from './recetasUtils'

const INPUT =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const BTN_DANGER =
  'h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm transition-colors'

const TIP_MERMA =
  'Pérdida de peso o volumen al limpiar o manipular el ingrediente. No es el margen de beneficio del plato.'

export default function RecetaDetalleIngredientesSection({
  recetaDetalle,
  formIngrediente,
  setFormIngrediente,
  articulos,
  onSelectArticulo,
  onReloadCoste,
  onAddIngrediente,
  onDeleteIngrediente,
  loadingAddIngrediente,
}) {
  const totalIng = (recetaDetalle.ingredientes || []).reduce((acc, ing) => {
    const bruta =
      ing.cantidad_bruta ??
      cantidadBruta(ing.cantidad_neta, ing.porcentaje_merma)
    return acc + costeLineaIng(bruta, ing.coste_unitario)
  }, 0)

  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <BookOpen size={20} strokeWidth={1.5} className="text-amber-500" />
        <h3 className="text-lg font-semibold">Ingredientes y cantidades</h3>
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
        Desglose por artículo: cantidad neta que entra al plato, merma de
        manipulación y cantidad bruta a retirar del almacén.
      </p>

      <div className="mb-6 overflow-x-auto rounded-xl border border-[#e2e5ed] dark:border-[#2e3347]">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-[#e2e5ed] bg-[#f0f2f5] dark:border-[#2e3347] dark:bg-[#222536]">
              <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Artículo
              </th>
              <th
                className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                title="Cantidad que entra en el plato (neta), en la unidad indicada."
              >
                Cant. neta
              </th>
              <th
                className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                title={TIP_MERMA}
              >
                % Merma
              </th>
              <th
                className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                title="Cantidad a descontar del almacén (incluye merma)."
              >
                Cant. bruta
              </th>
              <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Unidad
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
            {(recetaDetalle.ingredientes || []).map((ing) => {
              const bruta =
                ing.cantidad_bruta ??
                cantidadBruta(ing.cantidad_neta, ing.porcentaje_merma)
              const cLine = costeLineaIng(bruta, ing.coste_unitario)
              return (
                <tr
                  key={ing.id}
                  className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                >
                  <td className="px-3 py-2">
                    {ing.articulo_nombre || ing.articulo_id}
                  </td>
                  <td className="px-3 py-2">{ing.cantidad_neta}</td>
                  <td className="px-3 py-2">{ing.porcentaje_merma}</td>
                  <td className="px-3 py-2">{Number(bruta).toFixed(4)}</td>
                  <td className="px-3 py-2">{ing.unidad}</td>
                  <td className="px-3 py-2 font-medium">{formatEuro(cLine)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onDeleteIngrediente(ing.id)}
                      className={`inline-flex items-center gap-1 ${BTN_DANGER}`}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#f0f2f5] font-bold dark:bg-[#222536]">
              <td
                colSpan={5}
                className="px-3 py-3 text-[#111827] dark:text-[#e8eaf0]"
              >
                Coste total de la receta (todas las líneas)
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
        <h4 className="mb-3 text-[15px] font-semibold">Añadir ingrediente</h4>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Artículo (precio según inventario)
            </label>
            <select
              value={formIngrediente.articulo_id}
              onChange={(e) => onSelectArticulo(e.target.value)}
              className={INPUT}
            >
              <option value="">Seleccionar…</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} — {formatEuro(a.coste_unitario)}/
                  {a.unidad_medida || 'ud'}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Cantidad neta
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formIngrediente.cantidad_neta}
              onChange={(e) =>
                setFormIngrediente((f) => ({
                  ...f,
                  cantidad_neta: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div className="min-w-0">
            <label
              className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]"
              title={TIP_MERMA}
            >
              % Merma (manipulación)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="99"
              value={formIngrediente.porcentaje_merma}
              onChange={(e) =>
                setFormIngrediente((f) => ({
                  ...f,
                  porcentaje_merma: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Unidad
            </label>
            <select
              value={formIngrediente.unidad}
              onChange={(e) =>
                setFormIngrediente((f) => ({
                  ...f,
                  unidad: e.target.value,
                }))
              }
              className={INPUT}
            >
              {UNIDADES_OPTS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 items-end">
            <button
              type="button"
              disabled={loadingAddIngrediente}
              onClick={onAddIngrediente}
              className={`w-full ${BTN_PRIMARY}`}
            >
              Añadir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
