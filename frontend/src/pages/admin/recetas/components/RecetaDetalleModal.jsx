import { AlertTriangle, Edit, Save, X } from 'lucide-react'
import RecetaDetalleIngredientesSection from '../RecetaDetalleIngredientesSection'
import { BTN_PRIMARY, INPUT } from '../constants'
import {
  formatEuro,
  precioVentaSugerido,
  readPctCosteVenta,
} from '../recetasUtils'
import { semaforoMeta } from '../semaforoMeta'

export default function RecetaDetalleModal({
  open,
  onClose,
  recetaDetalle,
  modalError,
  loadingDetalle,
  formIngrediente,
  setFormIngrediente,
  articulos,
  onSelectArticulo,
  reloadCoste,
  onAddIngrediente,
  onDeleteIngrediente,
  loadingAddIngrediente,
  instruccionesDraft,
  setInstruccionesDraft,
  savingInstrucciones,
  onGuardarInstrucciones,
}) {
  if (!open) return null

  const pctRef = readPctCosteVenta()
  const costeModal = recetaDetalle
    ? Number(recetaDetalle.coste_total ?? recetaDetalle.coste ?? 0)
    : 0
  const pvpSugeridoModal =
    recetaDetalle &&
    !recetaDetalle.es_elaboracion &&
    costeModal > 0
      ? precioVentaSugerido(costeModal, pctRef)
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="absolute inset-0"
        role="presentation"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
                {recetaDetalle?.producto_nombre || 'Receta'}
              </h2>
              {recetaDetalle?.semaforo ? (
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${semaforoMeta(recetaDetalle.semaforo).badge}`}
                >
                  {semaforoMeta(recetaDetalle.semaforo).label}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              <span>
                Precio venta:{' '}
                <strong className="text-[#111827] dark:text-[#e8eaf0]">
                  {recetaDetalle?.precio_venta != null
                    ? formatEuro(recetaDetalle.precio_venta)
                    : '—'}
                </strong>
              </span>
              <span>
                Coste total:{' '}
                <strong className="text-[#111827] dark:text-[#e8eaf0]">
                  {formatEuro(
                    recetaDetalle?.coste_total ?? recetaDetalle?.coste
                  )}
                </strong>
              </span>
              {pvpSugeridoModal != null ? (
                <span title="Según % coste/venta guardado en este navegador">
                  PVP sugerido ({pctRef}%):{' '}
                  <strong className="text-[#111827] dark:text-[#e8eaf0]">
                    {formatEuro(pvpSugeridoModal)}
                  </strong>
                </span>
              ) : null}
              <span>
                Margen:{' '}
                <strong
                  className={
                    recetaDetalle?.semaforo
                      ? semaforoMeta(recetaDetalle.semaforo).text
                      : ''
                  }
                >
                  {recetaDetalle?.margen_porcentaje != null
                    ? `${Number(recetaDetalle.margen_porcentaje).toFixed(2)}%`
                    : '—'}
                </strong>
              </span>
              <span>
                Rendimiento:{' '}
                <strong className="text-[#111827] dark:text-[#e8eaf0]">
                  {Number(recetaDetalle?.rendimiento) > 0
                    ? Number(recetaDetalle.rendimiento).toFixed(2)
                    : '—'}{' '}
                  raciones / preparación
                </strong>
              </span>
              <span
                title="Coste total de ingredientes dividido entre el rendimiento de la receta."
              >
                Coste estimado por ración:{' '}
                <strong className="text-amber-600 dark:text-amber-400">
                  {(() => {
                    const rd = Number(recetaDetalle?.rendimiento) || 0
                    const ct = Number(
                      recetaDetalle?.coste_total ??
                        recetaDetalle?.coste
                    )
                    if (rd <= 0 || Number.isNaN(ct)) return '—'
                    return formatEuro(ct / rd)
                  })()}
                </strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {modalError ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle size={18} strokeWidth={1.5} />
            {modalError}
          </div>
        ) : null}

        {loadingDetalle ? (
          <p className="text-[#6b7280] dark:text-[#8b90a7]">Cargando…</p>
        ) : recetaDetalle ? (
          <>
            <RecetaDetalleIngredientesSection
              recetaDetalle={recetaDetalle}
              formIngrediente={formIngrediente}
              setFormIngrediente={setFormIngrediente}
              articulos={articulos}
              onSelectArticulo={onSelectArticulo}
              onReloadCoste={reloadCoste}
              onAddIngrediente={onAddIngrediente}
              onDeleteIngrediente={onDeleteIngrediente}
              loadingAddIngrediente={loadingAddIngrediente}
            />

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <Edit size={20} strokeWidth={1.5} className="text-amber-500" />
                Instrucciones
              </h4>
              <textarea
                value={instruccionesDraft}
                onChange={(e) => setInstruccionesDraft(e.target.value)}
                rows={5}
                className={`${INPUT} mb-3 resize-y`}
                placeholder="Pasos de elaboración…"
              />
              <button
                type="button"
                disabled={savingInstrucciones}
                onClick={onGuardarInstrucciones}
                className={`flex items-center gap-2 ${BTN_PRIMARY}`}
              >
                <Save size={20} strokeWidth={1.5} />
                Guardar instrucciones
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
