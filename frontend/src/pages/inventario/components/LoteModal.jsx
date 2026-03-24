import {
  BTN_SECONDARY_FIFO,
  INPUT_FIFO,
  SELECT_FIFO,
  SURFACE_FIFO,
} from '../fifoConstants'

export default function LoteModal({
  modalNuevo,
  setModalNuevo,
  formNuevo,
  setFormNuevo,
  modalNuevoErr,
  articulos,
  guardarNuevoLote,
  savingNuevo,
}) {
  if (!modalNuevo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fifo-modal-nuevo-title"
        className={`${SURFACE_FIFO} w-full max-w-md p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2
          id="fifo-modal-nuevo-title"
          className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
        >
          Nuevo lote
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="nl-articulo"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Artículo *
            </label>
            <select
              id="nl-articulo"
              value={formNuevo.articulo_id}
              onChange={(e) =>
                setFormNuevo((f) => ({ ...f, articulo_id: e.target.value }))
              }
              className={SELECT_FIFO}
            >
              <option value="">Seleccionar…</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="nl-cantidad"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Cantidad *
            </label>
            <input
              id="nl-cantidad"
              type="number"
              min="0"
              step="any"
              value={formNuevo.cantidad}
              onChange={(e) =>
                setFormNuevo((f) => ({ ...f, cantidad: e.target.value }))
              }
              className={INPUT_FIFO}
            />
          </div>
          <div>
            <label
              htmlFor="nl-coste"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Coste unitario *
            </label>
            <input
              id="nl-coste"
              type="number"
              min="0"
              step="0.01"
              value={formNuevo.coste_unitario}
              onChange={(e) =>
                setFormNuevo((f) => ({
                  ...f,
                  coste_unitario: e.target.value,
                }))
              }
              className={INPUT_FIFO}
            />
          </div>
          <div>
            <label
              htmlFor="nl-cad"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Fecha caducidad
            </label>
            <input
              id="nl-cad"
              type="date"
              value={formNuevo.fecha_caducidad}
              onChange={(e) =>
                setFormNuevo((f) => ({
                  ...f,
                  fecha_caducidad: e.target.value,
                }))
              }
              className={INPUT_FIFO}
            />
          </div>
          <div>
            <label
              htmlFor="nl-num"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Número de lote
            </label>
            <input
              id="nl-num"
              type="text"
              value={formNuevo.numero_lote}
              onChange={(e) =>
                setFormNuevo((f) => ({ ...f, numero_lote: e.target.value }))
              }
              className={INPUT_FIFO}
            />
          </div>
        </div>
        {modalNuevoErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {modalNuevoErr}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => !savingNuevo && setModalNuevo(false)}
            className={`${BTN_SECONDARY_FIFO} w-full sm:w-auto`}
            disabled={savingNuevo}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarNuevoLote}
            disabled={savingNuevo}
            className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black hover:bg-amber-600 disabled:opacity-40 sm:w-auto"
          >
            {savingNuevo ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
