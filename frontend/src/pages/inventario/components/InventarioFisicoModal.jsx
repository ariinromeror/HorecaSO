import { Check, X } from 'lucide-react'
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_BASE,
  formatStock,
  ICON_PROPS,
  INPUT,
} from '../constants'

export default function InventarioFisicoModal({
  modalInventarioFisico,
  setModalInventarioFisico,
  articulosOpciones,
  inventarioFisicoData,
  setInventarioFisicoData,
  countInventarioCambios,
  submitInventarioFisico,
  savingInventario,
}) {
  if (!modalInventarioFisico) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 ${CARD_BASE}`}
        role="dialog"
        aria-labelledby="modal-inv-title"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2
            id="modal-inv-title"
            className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
          >
            Inventario físico
          </h2>
          <button
            type="button"
            onClick={() => setModalInventarioFisico(false)}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X {...ICON_PROPS} className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
          Se ajustarán{' '}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {countInventarioCambios}
          </span>{' '}
          artículo{countInventarioCambios !== 1 ? 's' : ''}
        </p>
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="sticky top-0 bg-[#f0f2f5] dark:bg-[#222536]">
              <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Unidad</th>
                <th className="px-3 py-2 font-medium">Stock sistema</th>
                <th className="px-3 py-2 font-medium">Cantidad real</th>
              </tr>
            </thead>
            <tbody>
              {articulosOpciones.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                >
                  <td className="px-3 py-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
                    {a.nombre}
                  </td>
                  <td className="px-3 py-2">{a.unidad_medida}</td>
                  <td className="px-3 py-2">
                    {formatStock(a.stock_actual, a.unidad_medida)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inventarioFisicoData[a.id] ?? ''}
                      onChange={(e) =>
                        setInventarioFisicoData((d) => ({
                          ...d,
                          [a.id]: e.target.value,
                        }))
                      }
                      className={`${INPUT} py-2 text-sm`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {articulosOpciones.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
            No hay artículos. Carga la página de nuevo.
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setModalInventarioFisico(false)}
            className={BTN_SECONDARY}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submitInventarioFisico}
            disabled={
              savingInventario ||
              countInventarioCambios === 0 ||
              articulosOpciones.length === 0
            }
            className={BTN_PRIMARY}
          >
            <Check {...ICON_PROPS} className="h-5 w-5" />
            Guardar inventario
          </button>
        </div>
      </div>
    </div>
  )
}
