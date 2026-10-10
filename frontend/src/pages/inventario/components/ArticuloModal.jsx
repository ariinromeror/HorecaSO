import { Check, RefreshCw, X } from 'lucide-react'
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_BASE,
  CATEGORIAS_FORM,
  ICON_PROPS,
  INPUT,
  TEMP_OPTS,
  UNIDADES,
} from '../constants'
import { sugerirSku } from '../skuFromNombre'

export default function ArticuloModal({
  modalArticulo,
  setModalArticulo,
  formArticulo,
  setFormArticulo,
  submitArticulo,
  savingArticulo,
  skuManual,
  setSkuManual,
  articulos = [],
}) {
  if (!modalArticulo) return null

  const isNew = modalArticulo === 'new'
  const skusExistentes = articulos.map((a) => a.sku).filter(Boolean)
  const excluirSku =
    !isNew && modalArticulo?.sku ? modalArticulo.sku : null

  const regenerarSku = () => {
    const next = sugerirSku(
      formArticulo.nombre,
      skusExistentes,
      excluirSku
    )
    setFormArticulo((f) => ({ ...f, sku: next }))
    setSkuManual(false)
  }

  const onNombreChange = (value) => {
    setFormArticulo((f) => {
      const next = { ...f, nombre: value }
      if (isNew && !skuManual) {
        next.sku = sugerirSku(value, skusExistentes, null)
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 ${CARD_BASE}`}
        role="dialog"
        aria-labelledby="modal-articulo-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="modal-articulo-title"
            className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
          >
            {isNew ? 'Nuevo artículo' : 'Editar artículo'}
          </h2>
          <button
            type="button"
            onClick={() => setModalArticulo(null)}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X {...ICON_PROPS} className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Nombre *
            </label>
            <input
              value={formArticulo.nombre}
              onChange={(e) => onNombreChange(e.target.value)}
              className={INPUT}
              placeholder="Ej. Leche de almendras"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                SKU (auto)
              </label>
              <button
                type="button"
                onClick={regenerarSku}
                disabled={!formArticulo.nombre.trim()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-500/15 disabled:opacity-40 dark:text-amber-400"
              >
                <RefreshCw size={14} strokeWidth={1.5} />
                Generar
              </button>
            </div>
            <input
              value={formArticulo.sku}
              onChange={(e) => {
                setSkuManual(true)
                setFormArticulo((f) => ({ ...f, sku: e.target.value }))
              }}
              className={INPUT}
              placeholder="Se genera del nombre"
            />
            <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
              Se crea solo a partir del nombre (ej. Leche → LCH). Puedes
              cambiarlo; si ya existe, añade -2, -3…
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Unidad *
            </label>
            <select
              value={formArticulo.unidad_medida}
              onChange={(e) =>
                setFormArticulo((f) => ({
                  ...f,
                  unidad_medida: e.target.value,
                }))
              }
              className={INPUT}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                Stock mínimo
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formArticulo.stock_minimo}
                onChange={(e) =>
                  setFormArticulo((f) => ({
                    ...f,
                    stock_minimo: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                Stock máximo
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formArticulo.stock_maximo}
                onChange={(e) =>
                  setFormArticulo((f) => ({
                    ...f,
                    stock_maximo: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Coste unitario
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={formArticulo.coste_unitario}
              onChange={(e) =>
                setFormArticulo((f) => ({
                  ...f,
                  coste_unitario: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Categoría almacén
            </label>
            <select
              value={formArticulo.categoria_almacen}
              onChange={(e) =>
                setFormArticulo((f) => ({
                  ...f,
                  categoria_almacen: e.target.value,
                }))
              }
              className={INPUT}
            >
              {CATEGORIAS_FORM.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Temperatura
            </label>
            <select
              value={formArticulo.temperatura_almacen}
              onChange={(e) =>
                setFormArticulo((f) => ({
                  ...f,
                  temperatura_almacen: e.target.value,
                }))
              }
              className={INPUT}
            >
              {TEMP_OPTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setModalArticulo(null)}
            className={BTN_SECONDARY}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submitArticulo}
            disabled={savingArticulo}
            className={BTN_PRIMARY}
          >
            <Check {...ICON_PROPS} className="h-5 w-5" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
