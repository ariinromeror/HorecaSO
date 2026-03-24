import { Check } from 'lucide-react'
import CartaModal from './CartaModal'
import { BTN_PRIMARY } from '../constants'

export default function AlergenosModal({
  open,
  editingProducto,
  onClose,
  modalMsg,
  alergenosList,
  alergenosSeleccion,
  toggleAlergeno,
  submitAlergenos,
}) {
  if (!open || !editingProducto) return null
  return (
    <CartaModal
      title={`Alérgenos — ${editingProducto.nombre}`}
      onClose={onClose}
    >
      {modalMsg ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            modalMsg.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {modalMsg.text}
        </div>
      ) : null}
      <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        Marca los alérgenos que contiene el producto (información al
        consumidor).
      </p>
      <div className="grid max-h-[50vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
        {alergenosList.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e2e5ed] p-3 dark:border-[#2e3347]"
          >
            <input
              type="checkbox"
              checked={alergenosSeleccion.some(
                (x) => Number(x) === Number(a.id)
              )}
              onChange={() => toggleAlergeno(a.id)}
              className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500"
            />
            <span className="text-[15px] text-[#111827] dark:text-[#e8eaf0]">
              {a.nombre}
            </span>
          </label>
        ))}
      </div>
      {alergenosList.length === 0 ? (
        <p className="mt-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          No hay alérgenos en el catálogo. Verifica la base de datos.
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-lg border border-[#e2e5ed] px-6 font-semibold dark:border-[#2e3347]"
        >
          Cancelar
        </button>
        <button type="button" onClick={submitAlergenos} className={BTN_PRIMARY}>
          <span className="flex items-center gap-2">
            <Check size={20} strokeWidth={1.5} />
            Guardar alérgenos
          </span>
        </button>
      </div>
    </CartaModal>
  )
}
