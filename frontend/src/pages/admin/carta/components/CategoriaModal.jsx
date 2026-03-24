import { Check } from 'lucide-react'
import CartaModal from './CartaModal'
import { BTN_PRIMARY, INPUT, PRESET_COLORS } from '../constants'

export default function CategoriaModal({
  open,
  editingCategoria,
  onClose,
  modalMsg,
  catForm,
  setCatForm,
  submitCategoria,
}) {
  if (!open) return null
  return (
    <CartaModal
      title={editingCategoria ? 'Editar categoría' : 'Nueva categoría'}
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
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Nombre
          </label>
          <input
            type="text"
            value={catForm.nombre}
            onChange={(e) =>
              setCatForm((s) => ({ ...s, nombre: e.target.value }))
            }
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Icono (texto / referencia)
          </label>
          <input
            type="text"
            value={catForm.icono}
            onChange={(e) =>
              setCatForm((s) => ({ ...s, icono: e.target.value }))
            }
            className={INPUT}
            placeholder="Referencia almacenada (opcional)"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Color
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setCatForm((s) => ({ ...s, color: hex }))}
                className={`h-9 w-9 rounded-lg border-2 ${
                  catForm.color === hex
                    ? 'border-amber-500 ring-2 ring-amber-500/30'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Color ${hex}`}
              />
            ))}
          </div>
          <input
            type="color"
            value={catForm.color?.startsWith('#') ? catForm.color : '#f59e0b'}
            onChange={(e) =>
              setCatForm((s) => ({ ...s, color: e.target.value }))
            }
            className="h-12 w-full max-w-[120px] cursor-pointer rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Orden
          </label>
          <input
            type="number"
            value={catForm.orden}
            onChange={(e) =>
              setCatForm((s) => ({
                ...s,
                orden: Number(e.target.value) || 0,
              }))
            }
            className={INPUT}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-lg border border-[#e2e5ed] px-6 font-semibold text-[#111827] dark:border-[#2e3347] dark:text-[#e8eaf0]"
          >
            Cancelar
          </button>
          <button type="button" onClick={submitCategoria} className={BTN_PRIMARY}>
            <span className="flex items-center gap-2">
              <Check size={20} strokeWidth={1.5} />
              Guardar
            </span>
          </button>
        </div>
      </div>
    </CartaModal>
  )
}
