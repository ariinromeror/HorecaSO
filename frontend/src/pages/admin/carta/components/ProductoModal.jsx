import { Check } from 'lucide-react'
import CartaModal from './CartaModal'
import { BTN_PRIMARY, INPUT } from '../constants'

export default function ProductoModal({
  open,
  editingProducto,
  onClose,
  modalMsg,
  prodForm,
  setProdForm,
  categoriasOrdenadas,
  submitProducto,
}) {
  if (!open) return null
  return (
    <CartaModal
      title={editingProducto ? 'Editar producto' : 'Nuevo producto'}
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
            value={prodForm.nombre}
            onChange={(e) =>
              setProdForm((s) => ({ ...s, nombre: e.target.value }))
            }
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Descripción
          </label>
          <textarea
            value={prodForm.descripcion}
            onChange={(e) =>
              setProdForm((s) => ({ ...s, descripcion: e.target.value }))
            }
            rows={3}
            className={`${INPUT} resize-y`}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Precio (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={prodForm.precio}
            onChange={(e) =>
              setProdForm((s) => ({ ...s, precio: e.target.value }))
            }
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Categoría
          </label>
          <select
            value={prodForm.categoria_id}
            onChange={(e) =>
              setProdForm((s) => ({ ...s, categoria_id: e.target.value }))
            }
            className={INPUT}
          >
            <option value="">Seleccionar…</option>
            {categoriasOrdenadas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            IVA
          </label>
          <select
            value={prodForm.iva_porcentaje}
            onChange={(e) =>
              setProdForm((s) => ({
                ...s,
                iva_porcentaje: e.target.value,
              }))
            }
            className={INPUT}
          >
            <option value="10">10%</option>
            <option value="21">21%</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Pantalla KDS (cocina / barra)
          </label>
          <select
            value={prodForm.destino_kds}
            onChange={(e) =>
              setProdForm((s) => ({ ...s, destino_kds: e.target.value }))
            }
            className={INPUT}
          >
            <option value="cocina">Cocina</option>
            <option value="barra">Barra</option>
            <option value="ninguno">No mostrar en KDS</option>
          </select>
          <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
            Define si el pedido aparece en el monitor de cocina, de barra o
            en ninguno (p. ej. latas servidas solo en sala).
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={prodForm.activo}
            onChange={(e) =>
              setProdForm((s) => ({ ...s, activo: e.target.checked }))
            }
            className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500"
          />
          <span className="text-[#111827] dark:text-[#e8eaf0]">
            Producto activo
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-lg border border-[#e2e5ed] px-6 font-semibold dark:border-[#2e3347]"
          >
            Cancelar
          </button>
          <button type="button" onClick={submitProducto} className={BTN_PRIMARY}>
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
