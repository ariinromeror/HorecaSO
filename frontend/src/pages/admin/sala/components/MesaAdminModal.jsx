import { Check, X } from 'lucide-react'
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_BASE,
  FORMAS,
  ICON,
  INPUT,
  ZONAS,
} from '../constants'

export default function MesaAdminModal({
  modalMesa,
  formMesa,
  setFormMesa,
  formError,
  saving,
  cerrarModal,
  guardarMesa,
}) {
  if (modalMesa === false) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`max-h-[90vh] w-full max-w-md overflow-y-auto p-6 ${CARD_BASE}`}
        role="dialog"
        aria-labelledby="modal-mesa-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="modal-mesa-title"
            className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
          >
            {modalMesa === null
              ? 'Nueva mesa'
              : `Editar mesa Nº ${modalMesa.numero}`}
          </h2>
          <button
            type="button"
            onClick={cerrarModal}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X {...ICON} className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Número de mesa *
            </label>
            <input
              type="number"
              min={1}
              value={formMesa.numero}
              onChange={(e) =>
                setFormMesa((f) => ({ ...f, numero: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Capacidad (pax) *
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={formMesa.capacidad}
              onChange={(e) =>
                setFormMesa((f) => ({
                  ...f,
                  capacidad: Number(e.target.value) || 0,
                }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Zona *
            </label>
            <select
              value={formMesa.zona}
              onChange={(e) =>
                setFormMesa((f) => ({ ...f, zona: e.target.value }))
              }
              className={INPUT}
            >
              {ZONAS.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Forma *
            </label>
            <select
              value={formMesa.forma}
              onChange={(e) =>
                setFormMesa((f) => ({ ...f, forma: e.target.value }))
              }
              className={INPUT}
            >
              {FORMAS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {formError ? (
            <p className="text-sm text-red-500 dark:text-red-400">
              {formError}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={cerrarModal}
            className={BTN_SECONDARY}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarMesa}
            disabled={saving}
            className={BTN_PRIMARY}
          >
            <Check {...ICON} className="h-5 w-5" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
