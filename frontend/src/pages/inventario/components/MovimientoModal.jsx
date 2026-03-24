import { Check, X } from 'lucide-react'
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_BASE,
  ICON_PROPS,
  INPUT,
  TIPOS_MOV_MODAL,
} from '../constants'

export default function MovimientoModal({
  modalMovimiento,
  setModalMovimiento,
  formMovimiento,
  setFormMovimiento,
  submitMovimiento,
  savingMovimiento,
}) {
  if (!modalMovimiento) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`max-h-[90vh] w-full max-w-md overflow-y-auto p-6 ${CARD_BASE}`}
        role="dialog"
        aria-labelledby="modal-mov-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="modal-mov-title"
            className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
          >
            Movimiento de stock
          </h2>
          <button
            type="button"
            onClick={() => setModalMovimiento(false)}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X {...ICON_PROPS} className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
          Artículo:{' '}
          <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
            {modalMovimiento.articulo.nombre}
          </span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Tipo
            </label>
            <select
              value={formMovimiento.tipo}
              onChange={(e) =>
                setFormMovimiento((f) => ({ ...f, tipo: e.target.value }))
              }
              className={INPUT}
            >
              {TIPOS_MOV_MODAL.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Cantidad *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formMovimiento.cantidad}
              onChange={(e) =>
                setFormMovimiento((f) => ({
                  ...f,
                  cantidad: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Motivo
            </label>
            <input
              value={formMovimiento.motivo}
              onChange={(e) =>
                setFormMovimiento((f) => ({ ...f, motivo: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          {formMovimiento.tipo === 'entrada' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                Actualizar coste unitario (opcional)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={formMovimiento.coste_unitario}
                onChange={(e) =>
                  setFormMovimiento((f) => ({
                    ...f,
                    coste_unitario: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setModalMovimiento(false)}
            className={BTN_SECONDARY}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submitMovimiento}
            disabled={savingMovimiento}
            className={BTN_PRIMARY}
          >
            <Check {...ICON_PROPS} className="h-5 w-5" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
