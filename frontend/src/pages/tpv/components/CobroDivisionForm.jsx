import { Check, Plus, X } from 'lucide-react'
import {
  INPUT_COBR,
  METODOS_DIVISION,
  SELECT_METODO_PARTE,
  formatEuro,
  labelMetodoPago,
} from '../constants'

export default function CobroDivisionForm({
  ticket,
  lineas,
  totalPagado,
  pendienteDivision,
  importePago,
  setImportePago,
  rellenarPendiente,
  metodoPagoDivision,
  setMetodoPagoDivision,
  loadingPago,
  handleAnadirPagoDivision,
  numPartesInput,
  setNumPartesInput,
  handleDividirRestanteEnPartes,
  borradorPartesPagos,
  setBorradorPartesPagos,
  handleConfirmarPartesPagos,
  pagosRegistrados,
  handleEliminarPagoDivision,
  handleCompletarDivision,
  setModoDivision,
  setDivisionError,
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] p-3 dark:border-[#2e3347] dark:bg-[#222536]">
        <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          Total: {formatEuro(ticket?.total)}
        </p>
        <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Pagado: {formatEuro(totalPagado)}
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${
            pendienteDivision > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          Pendiente: {formatEuro(pendienteDivision)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Importe..."
            value={importePago}
            onChange={(e) => setImportePago(e.target.value)}
            className={INPUT_COBR}
          />
          <button
            type="button"
            onClick={rellenarPendiente}
            disabled={pendienteDivision <= 0}
            className="h-10 shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-semibold text-amber-700 disabled:opacity-40 dark:text-amber-400"
          >
            Pendiente
          </button>
        </div>
        <select
          value={metodoPagoDivision}
          onChange={(e) =>
            setMetodoPagoDivision(e.target.value)
          }
          className={INPUT_COBR}
        >
          {METODOS_DIVISION.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={loadingPago || !lineas.length}
          onClick={handleAnadirPagoDivision}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-black transition-colors hover:bg-amber-600 disabled:opacity-40"
        >
          <Plus size={18} strokeWidth={1.5} />
          Añadir pago
        </button>
      </div>

      <div className="rounded-lg border border-[#e2e5ed] bg-[#f0f2f5]/80 p-3 dark:border-[#2e3347] dark:bg-[#1e2130]">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
          Dividir restante en partes
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-[#111827] dark:text-[#e8eaf0]">
            <span className="text-[#6b7280] dark:text-[#8b90a7]">
              ¿En cuántas partes?
            </span>
            <input
              type="number"
              min={2}
              max={20}
              value={numPartesInput}
              onChange={(e) => setNumPartesInput(e.target.value)}
              className={INPUT_COBR}
            />
          </label>
          <button
            type="button"
            disabled={
              loadingPago ||
              pendienteDivision <= 0 ||
              !lineas.length
            }
            onClick={handleDividirRestanteEnPartes}
            className="h-10 shrink-0 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 text-sm font-semibold text-amber-800 dark:text-amber-400 disabled:opacity-40"
          >
            Dividir restante
          </button>
        </div>

        {borradorPartesPagos?.length ? (
          <div className="mt-3 space-y-2 border-t border-[#e2e5ed] pt-3 dark:border-[#2e3347]">
            {borradorPartesPagos.map((row, idx) => (
              <div
                key={`parte-${idx}`}
                className="flex flex-col gap-2 rounded-md bg-white/80 p-2 dark:bg-[#222536]/90 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="shrink-0 text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
                  Persona {row.persona}: {formatEuro(row.importe)}
                </span>
                <div className="min-w-0 w-full flex-1 sm:min-w-[10rem]">
                  <select
                    value={row.metodo_pago}
                    onChange={(e) => {
                      const v = e.target.value
                      setBorradorPartesPagos((prev) =>
                        prev
                          ? prev.map((r, i) =>
                              i === idx
                                ? { ...r, metodo_pago: v }
                                : r
                            )
                          : prev
                      )
                    }}
                    className={SELECT_METODO_PARTE}
                    aria-label={`Método de pago persona ${row.persona}`}
                  >
                    {METODOS_DIVISION.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={loadingPago}
              onClick={handleConfirmarPartesPagos}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              <Check size={18} strokeWidth={1.5} />
              Confirmar todos
            </button>
          </div>
        ) : null}
      </div>

      {pagosRegistrados.length > 0 ? (
        <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#e2e5ed] p-2 dark:border-[#2e3347]">
          {pagosRegistrados.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md bg-[#f0f2f5] px-2 py-1.5 text-sm dark:bg-[#222536]"
            >
              <span className="min-w-0 truncate text-[#111827] dark:text-[#e8eaf0]">
                {formatEuro(p.importe)} —{' '}
                {labelMetodoPago(p.metodo_pago)}
              </span>
              <button
                type="button"
                onClick={() => handleEliminarPagoDivision(p.id)}
                disabled={loadingPago}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                aria-label="Eliminar pago"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {pendienteDivision <= 0 && pagosRegistrados.length > 0 ? (
        <button
          type="button"
          onClick={handleCompletarDivision}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-sm font-bold text-emerald-700 dark:text-emerald-400"
        >
          <Check size={18} strokeWidth={1.5} />
          Cobro completado — Sala
        </button>
      ) : null}

      {pagosRegistrados.length === 0 ? (
        <button
          type="button"
          onClick={() => {
            setModoDivision(false)
            setDivisionError('')
          }}
          className="h-10 w-full rounded-lg border border-[#e2e5ed] text-sm font-medium text-[#6b7280] hover:bg-[#f0f2f5] dark:border-[#2e3347] dark:text-[#9ca3af] dark:hover:bg-[#222536]"
        >
          Cancelar división
        </button>
      ) : null}
    </div>
  )
}
