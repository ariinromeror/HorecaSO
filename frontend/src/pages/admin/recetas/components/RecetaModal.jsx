import { X } from 'lucide-react'
import { BTN_PRIMARY, INPUT } from '../constants'

export default function RecetaModal({
  open,
  onClose,
  modalError,
  formCrear,
  setFormCrear,
  productosSinReceta,
  onCrearReceta,
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="absolute inset-0"
        role="presentation"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nueva receta</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        {modalError ? (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">
            {modalError}
          </div>
        ) : null}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Producto (sin receta)
            </label>
            <select
              value={formCrear.producto_id}
              onChange={(e) =>
                setFormCrear((f) => ({ ...f, producto_id: e.target.value }))
              }
              className={INPUT}
            >
              <option value="">Seleccionar…</option>
              {productosSinReceta.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Rendimiento
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formCrear.rendimiento}
              onChange={(e) =>
                setFormCrear((f) => ({
                  ...f,
                  rendimiento: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Instrucciones (opcional)
            </label>
            <textarea
              value={formCrear.instrucciones}
              onChange={(e) =>
                setFormCrear((f) => ({
                  ...f,
                  instrucciones: e.target.value,
                }))
              }
              rows={4}
              className={`${INPUT} resize-y`}
            />
          </div>
          <button
            type="button"
            onClick={onCrearReceta}
            className={`w-full ${BTN_PRIMARY}`}
          >
            Crear receta
          </button>
        </div>
      </div>
    </div>
  )
}
