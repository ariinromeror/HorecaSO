import { ChefHat, Plus } from 'lucide-react'
import RecetaDetalleModal from './components/RecetaDetalleModal'
import RecetaModal from './components/RecetaModal'
import RecetasTable from './components/RecetasTable'
import { formatEuro } from './recetasUtils'
import { BTN_PRIMARY } from './constants'
import { useRecetas } from './hooks/useRecetas'

export default function RecetasPage() {
  const r = useRecetas()

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[#111827] dark:text-[#e8eaf0]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <ChefHat
            size={32}
            strokeWidth={1.5}
            className="text-amber-500"
            aria-hidden
          />
          <h1 className="text-2xl font-bold">Recetas y costes</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            r.setModalError(null)
            r.setFormCrear({
              producto_id: r.productosSinReceta[0]?.id || '',
              rendimiento: '1',
              instrucciones: '',
            })
            r.setModalCrear(true)
          }}
          className={`flex h-12 items-center justify-center gap-2 self-end sm:self-auto ${BTN_PRIMARY}`}
        >
          <Plus size={20} strokeWidth={1.5} />
          Nueva receta
        </button>
      </div>

      {r.feedback ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-[15px] ${
            r.feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {r.feedback.msg}
        </div>
      ) : null}

      <details className="mb-6 rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <summary className="cursor-pointer text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Ingredientes del almacén — precios de compra (referencia)
        </summary>
        <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          Lista de artículos con coste unitario en inventario. Úsala para
          contrastar con el desglose de cada receta al abrir un plato.
        </p>
        <div className="mt-3 max-h-56 overflow-y-auto overflow-x-auto rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
          <table className="w-full min-w-[480px] text-left text-[14px]">
            <thead className="sticky top-0 bg-[#f0f2f5] dark:bg-[#222536]">
              <tr>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Artículo
                </th>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  SKU
                </th>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Unidad
                </th>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Precio / ud.
                </th>
              </tr>
            </thead>
            <tbody>
              {r.articulosOrdenados.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-[#e2e5ed] dark:border-[#2e3347]"
                >
                  <td className="px-3 py-2">{a.nombre || '—'}</td>
                  <td className="px-3 py-2 text-[#6b7280] dark:text-[#8b90a7]">
                    {a.sku || '—'}
                  </td>
                  <td className="px-3 py-2">{a.unidad_medida || '—'}</td>
                  <td className="px-3 py-2 font-medium">
                    {formatEuro(a.coste_unitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <RecetasTable
        loadingSemaforo={r.loadingSemaforo}
        recetasSemaforo={r.recetasSemaforo}
        filtroColor={r.filtroColor}
        setFiltroColor={r.setFiltroColor}
        onCardClick={r.handleCardClick}
      />

      <RecetaDetalleModal
        open={r.modalDetalle}
        onClose={() => r.setModalDetalle(false)}
        recetaDetalle={r.recetaDetalle}
        modalError={r.modalError}
        loadingDetalle={r.loadingDetalle}
        formIngrediente={r.formIngrediente}
        setFormIngrediente={r.setFormIngrediente}
        articulos={r.articulos}
        onSelectArticulo={r.onSelectArticulo}
        reloadCoste={r.reloadCoste}
        onAddIngrediente={r.handleAddIngrediente}
        onDeleteIngrediente={r.handleDeleteIng}
        loadingAddIngrediente={r.loadingAddIngrediente}
        instruccionesDraft={r.instruccionesDraft}
        setInstruccionesDraft={r.setInstruccionesDraft}
        savingInstrucciones={r.savingInstrucciones}
        onGuardarInstrucciones={r.handleGuardarInstrucciones}
      />

      <RecetaModal
        open={r.modalCrear}
        onClose={() => r.setModalCrear(false)}
        modalError={r.modalError}
        formCrear={r.formCrear}
        setFormCrear={r.setFormCrear}
        productosSinReceta={r.productosSinReceta}
        onCrearReceta={r.handleCrearReceta}
      />
    </div>
  )
}
