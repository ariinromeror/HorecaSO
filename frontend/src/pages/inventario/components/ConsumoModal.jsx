import {
  BTN_SECONDARY_FIFO,
  INPUT_FIFO,
  SELECT_FIFO,
  SURFACE_FIFO,
} from '../fifoConstants'

export default function ConsumoModal({
  modalConsumir,
  setModalConsumir,
  formConsumir,
  setFormConsumir,
  modalConsumirErr,
  articulos,
  ejecutarConsumir,
  savingConsumir,
}) {
  if (!modalConsumir) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fifo-modal-consumir-title"
        className={`${SURFACE_FIFO} w-full max-w-md p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2
          id="fifo-modal-consumir-title"
          className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
        >
          Consumir stock FIFO
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="co-articulo"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Artículo *
            </label>
            <select
              id="co-articulo"
              value={formConsumir.articulo_id}
              onChange={(e) =>
                setFormConsumir((f) => ({
                  ...f,
                  articulo_id: e.target.value,
                }))
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
              htmlFor="co-cantidad"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Cantidad *
            </label>
            <input
              id="co-cantidad"
              type="number"
              min="0"
              step="any"
              value={formConsumir.cantidad}
              onChange={(e) =>
                setFormConsumir((f) => ({ ...f, cantidad: e.target.value }))
              }
              className={INPUT_FIFO}
            />
          </div>
          <div>
            <label
              htmlFor="co-motivo"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Motivo *
            </label>
            <input
              id="co-motivo"
              type="text"
              value={formConsumir.motivo}
              onChange={(e) =>
                setFormConsumir((f) => ({ ...f, motivo: e.target.value }))
              }
              className={INPUT_FIFO}
            />
          </div>
          <p className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 text-sm text-[#6b7280] dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#8b90a7]">
            El sistema consumirá automáticamente los lotes más antiguos
            primero.
          </p>
        </div>
        {modalConsumirErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {modalConsumirErr}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => !savingConsumir && setModalConsumir(false)}
            className={`${BTN_SECONDARY_FIFO} w-full sm:w-auto`}
            disabled={savingConsumir}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={ejecutarConsumir}
            disabled={savingConsumir}
            className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-red-600 px-4 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-40 sm:w-auto"
          >
            {savingConsumir ? 'Consumiendo…' : 'Consumir'}
          </button>
        </div>
      </div>
    </div>
  )
}
