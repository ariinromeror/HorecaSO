import { AlertTriangle, Search, Trash2, X } from 'lucide-react'
import {
  BTN_DANGER_MERMAS,
  BTN_SECONDARY_MERMAS,
  INPUT_MERMAS,
  MOTIVO_OPTS,
  ICON_MERMAS,
} from '../mermasConstants'

export default function MermaModal({
  modalMerma,
  setModalMerma,
  comboArticuloRef,
  buscarArticulo,
  setBuscarArticulo,
  listaAbierta,
  setListaAbierta,
  articulosFiltrados,
  seleccionarArticulo,
  articuloSeleccionado,
  setArticuloSeleccionado,
  setFormMerma,
  formMerma,
  validarCantidad,
  cantidadError,
  submitMerma,
  saving,
}) {
  if (!modalMerma) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white p-6 dark:border-[#2e3347] dark:bg-[#1a1d27]"
        role="dialog"
        aria-labelledby="merma-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="merma-modal-title"
            className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
          >
            Registrar merma
          </h2>
          <button
            type="button"
            onClick={() => setModalMerma(false)}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X {...ICON_MERMAS} className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative" ref={comboArticuloRef}>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Artículo *
            </label>
            <div className="relative">
              <Search
                {...ICON_MERMAS}
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]"
              />
              <input
                type="text"
                value={buscarArticulo}
                onChange={(e) => {
                  setBuscarArticulo(e.target.value)
                  setListaAbierta(true)
                  if (!e.target.value.trim()) {
                    setArticuloSeleccionado(null)
                    setFormMerma((f) => ({
                      ...f,
                      articulo_id: '',
                    }))
                  }
                }}
                onFocus={() => setListaAbierta(true)}
                placeholder="Buscar artículo..."
                className={`${INPUT_MERMAS} pl-11`}
                autoComplete="off"
              />
              {listaAbierta && articulosFiltrados.length > 0 ? (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[#e2e5ed] bg-white py-1 shadow-lg dark:border-[#2e3347] dark:bg-[#222536]">
                  {articulosFiltrados.slice(0, 50).map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => seleccionarArticulo(a)}
                        className="w-full px-4 py-2 text-left text-sm text-[#111827] hover:bg-[#f0f2f5] dark:text-[#e8eaf0] dark:hover:bg-[#2e3347]"
                      >
                        {a.nombre} — stock actual:{' '}
                        {new Intl.NumberFormat('es-ES', {
                          maximumFractionDigits: 4,
                        }).format(Number(a.stock_actual) || 0)}{' '}
                        {a.unidad_medida}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {articuloSeleccionado ? (
              <p
                className={`mt-2 text-xs ${
                  Number(articuloSeleccionado.stock_actual) <=
                  Number(articuloSeleccionado.stock_minimo || 0)
                    ? 'text-amber-500'
                    : 'text-[#6b7280] dark:text-[#9ca3af]'
                }`}
              >
                Stock disponible:{' '}
                {new Intl.NumberFormat('es-ES', {
                  maximumFractionDigits: 4,
                }).format(Number(articuloSeleccionado.stock_actual) || 0)}{' '}
                {articuloSeleccionado.unidad_medida}
                {Number(articuloSeleccionado.stock_actual) <=
                Number(articuloSeleccionado.stock_minimo || 0) ? (
                  <span className="ml-1 inline-flex items-center gap-1">
                    <AlertTriangle
                      {...ICON_MERMAS}
                      className="inline h-3.5 w-3.5"
                    />
                    Bajo mínimo
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Cantidad *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formMerma.cantidad}
              onChange={(e) => {
                setFormMerma((f) => ({ ...f, cantidad: e.target.value }))
                if (articuloSeleccionado) {
                  validarCantidad(e.target.value, articuloSeleccionado)
                }
              }}
              className={INPUT_MERMAS}
            />
            {cantidadError ? (
              <p className="mt-1 text-sm text-red-500">{cantidadError}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Motivo *
            </label>
            <select
              value={formMerma.motivo}
              onChange={(e) =>
                setFormMerma((f) => ({ ...f, motivo: e.target.value }))
              }
              className={INPUT_MERMAS}
            >
              {MOTIVO_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Detalle
            </label>
            <input
              value={formMerma.motivo_detalle}
              onChange={(e) =>
                setFormMerma((f) => ({
                  ...f,
                  motivo_detalle: e.target.value,
                }))
              }
              placeholder="Detalle adicional (opcional)"
              className={INPUT_MERMAS}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              Coste unitario (€) — dejar vacío para usar el del artículo
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={formMerma.coste_unitario}
              onChange={(e) =>
                setFormMerma((f) => ({
                  ...f,
                  coste_unitario: e.target.value,
                }))
              }
              className={INPUT_MERMAS}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setModalMerma(false)}
            className={BTN_SECONDARY_MERMAS}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submitMerma}
            disabled={
              saving ||
              !!cantidadError ||
              !articuloSeleccionado ||
              !formMerma.cantidad
            }
            className={BTN_DANGER_MERMAS}
          >
            <Trash2 {...ICON_MERMAS} className="h-5 w-5" />
            Registrar merma
          </button>
        </div>
      </div>
    </div>
  )
}
