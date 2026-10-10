import { DollarSign, Printer, SplitSquareHorizontal } from 'lucide-react'
import CobroDivisionForm from './CobroDivisionForm'
import { METODOS_DIVISION, formatEuro } from '../constants'
import { printViaAgentOrBrowser } from './TicketPrintView'

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
  productoNombrePorId,
  mesaLabel,
  onPrintComanda,
  onPrintTicket,
}) {
  const handlePrintComanda = async () => {
    if (onPrintComanda) {
      onPrintComanda()
      return
    }
    await printViaAgentOrBrowser({
      tipo: 'comanda',
      mesa: mesaLabel,
      lineas: (lineas || []).map((ln) => ({
        cantidad: ln.cantidad,
        nombre:
          productoNombrePorId?.get?.(String(ln.producto_id)) || 'Producto',
        nota: ln.nota,
      })),
    })
  }

  const handlePrintTicket = async () => {
    if (onPrintTicket) {
      onPrintTicket()
      return
    }
    await printViaAgentOrBrowser({
      tipo: 'ticket',
      mesa: mesaLabel,
      total: Number(ticket?.total) || 0,
      lineas: (lineas || []).map((ln) => ({
        cantidad: ln.cantidad,
        nombre:
          productoNombrePorId?.get?.(String(ln.producto_id)) || 'Producto',
        subtotal: Number(ln.subtotal) || 0,
        nota: ln.nota,
      })),
    })
  }

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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-black transition-colors active:bg-amber-600 hover:bg-amber-600 disabled:opacity-40"
            >
              <DollarSign size={18} strokeWidth={1.5} />
              Cobro simple
            </button>
            <button
              type="button"
              disabled={!lineas.length || cobrarLoading}
              onClick={iniciarDivision}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] text-sm font-semibold text-[#111827] transition-colors active:bg-[#e8eaef] hover:bg-[#e8eaef] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] dark:hover:bg-[#2e3347] disabled:opacity-40"
            >
              <SplitSquareHorizontal size={18} strokeWidth={1.5} />
              Dividir cuenta
            </button>
            <button
              type="button"
              disabled={!lineas.length}
              onClick={handlePrintComanda}
              className="flex h-auto min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-[#e2e5ed] bg-white px-3 py-2 text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Printer size={18} strokeWidth={1.5} />
                Comanda cocina
              </span>
              <span className="text-xs font-normal text-[#6b7280] dark:text-[#8b90a7]">
                Sin precios · cocina/barra
              </span>
            </button>
            <button
              type="button"
              disabled={!lineas.length}
              onClick={handlePrintTicket}
              className="flex h-auto min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-400 disabled:opacity-40"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Printer size={18} strokeWidth={1.5} />
                Ticket cliente
              </span>
              <span className="text-xs font-normal text-amber-700/80 dark:text-amber-400/80">
                Con precios y total
              </span>
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
