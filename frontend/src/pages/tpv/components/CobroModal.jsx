import { DollarSign, SplitSquareHorizontal } from 'lucide-react'
import CobroDivisionForm from './CobroDivisionForm'
import { METODOS_DIVISION, formatEuro } from '../constants'

export default function CobroModal({
  ticket,
  lineas,
  divisionError,
  modoDivision,
  setModoDivision,
  setDivisionError,
  metodoPago,
  setMetodoPago,
  cobrarLoading,
  handleCobrar,
  iniciarDivision,
  importePago,
  setImportePago,
  metodoPagoDivision,
  setMetodoPagoDivision,
  loadingPago,
  handleAnadirPagoDivision,
  rellenarPendiente,
  pendienteDivision,
  numPartesInput,
  setNumPartesInput,
  handleDividirRestanteEnPartes,
  borradorPartesPagos,
  setBorradorPartesPagos,
  handleConfirmarPartesPagos,
  pagosRegistrados,
  handleEliminarPagoDivision,
  handleCompletarDivision,
  totalPagado,
}) {
  return (
    <>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
          Total
        </span>
        <span className="text-4xl font-bold text-amber-500">
          {formatEuro(ticket?.total)}
        </span>
      </div>

      {divisionError ? (
        <div
          className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {divisionError}
        </div>
      ) : null}

      {!modoDivision ? (
        <>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="h-12 w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
          >
            {METODOS_DIVISION.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              disabled={!lineas.length || cobrarLoading}
              onClick={handleCobrar}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-black transition-colors hover:bg-amber-600 disabled:opacity-40"
            >
              <DollarSign size={18} strokeWidth={1.5} />
              Cobro simple
            </button>
            <button
              type="button"
              disabled={!lineas.length || cobrarLoading}
              onClick={iniciarDivision}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] text-sm font-semibold text-[#111827] transition-colors hover:bg-[#e8eaef] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] dark:hover:bg-[#2e3347] disabled:opacity-40"
            >
              <SplitSquareHorizontal size={18} strokeWidth={1.5} />
              Dividir cuenta
            </button>
          </div>
        </>
      ) : (
        <CobroDivisionForm
          ticket={ticket}
          lineas={lineas}
          totalPagado={totalPagado}
          pendienteDivision={pendienteDivision}
          importePago={importePago}
          setImportePago={setImportePago}
          rellenarPendiente={rellenarPendiente}
          metodoPagoDivision={metodoPagoDivision}
          setMetodoPagoDivision={setMetodoPagoDivision}
          loadingPago={loadingPago}
          handleAnadirPagoDivision={handleAnadirPagoDivision}
          numPartesInput={numPartesInput}
          setNumPartesInput={setNumPartesInput}
          handleDividirRestanteEnPartes={handleDividirRestanteEnPartes}
          borradorPartesPagos={borradorPartesPagos}
          setBorradorPartesPagos={setBorradorPartesPagos}
          handleConfirmarPartesPagos={handleConfirmarPartesPagos}
          pagosRegistrados={pagosRegistrados}
          handleEliminarPagoDivision={handleEliminarPagoDivision}
          handleCompletarDivision={handleCompletarDivision}
          setModoDivision={setModoDivision}
          setDivisionError={setDivisionError}
        />
      )}
    </>
  )
}
