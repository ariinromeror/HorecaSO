import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChefHat, Layers, Plus } from 'lucide-react'
import RecetaModal from './components/RecetaModal'
import RecetasTable from './components/RecetasTable'
import { formatEuro } from './recetasUtils'
import { BTN_PRIMARY } from './constants'
import { useRecetas } from './hooks/useRecetas'

export default function RecetasPage() {
  const r = useRecetas()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const detalleQ = searchParams.get('detalle')

  useEffect(() => {
    if (!detalleQ) return
    navigate(
      `/admin/recetas/elaboraciones?receta=${encodeURIComponent(detalleQ)}`,
      { replace: true }
    )
  }, [detalleQ, navigate])

  const platosSemaforo = useMemo(
    () =>
      (r.recetasSemaforo || []).filter((row) => row.es_elaboracion !== true),
    [r.recetasSemaforo]
  )

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
          <div>
            <h1 className="text-2xl font-bold">Recetas de carta</h1>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Solo aparecen platos marcados en carta con &quot;tiene receta&quot;
              (cocina / coste). Bebidas embotelladas u otros sin ese marcador no
              se listan aquí. Las elaboraciones tienen su propio panel.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <Link
            to="/admin/costes"
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-4 font-medium dark:border-[#2e3347]"
          >
            Gastos operativos
          </Link>
          <Link
            to="/admin/recetas/elaboraciones"
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-4 font-medium dark:border-[#2e3347]"
          >
            <Layers size={20} strokeWidth={1.5} />
            Elaboraciones
          </Link>
          <Link
            to="/admin/recetas/elaboraciones"
            className={`flex h-12 items-center justify-center gap-2 ${BTN_PRIMARY}`}
          >
            <Plus size={20} strokeWidth={1.5} />
            Nueva receta
          </Link>
        </div>
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
          <table className="horeca-body-text w-full min-w-[480px] text-left text-[14px]">
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
                    {formatEuro(a.coste_unitario_efectivo ?? a.coste_unitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <RecetasTable
        loadingSemaforo={r.loadingSemaforo}
        recetasSemaforo={platosSemaforo}
        filtroColor={r.filtroColor}
        setFiltroColor={r.setFiltroColor}
        onCardClick={r.handleCardClick}
        onDeleteReceta={r.handleDeleteReceta}
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
