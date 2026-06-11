import {
  ArrowLeft,
  ChefHat,
  ShoppingCart,
} from 'lucide-react'
import Loader from '../../components/shared/Loader'
import CartaPanel from './components/CartaPanel'
import CobroModal from './components/CobroModal'
import LineasTicket from './components/LineasTicket'
import TpvMesaOcupadaAlert from './components/TpvMesaOcupadaAlert'
import { MESA_OCUPADA_SIN_TICKET_MSG } from './constants'
import { useTicketTPV } from './hooks/useTicketTPV'

export default function TPVPage() {
  const {
    mesaId,
    navigate,
    categorias,
    categActiva,
    setCategActiva,
    productosActivos,
    ticket,
    loading,
    error,
    metodoPago,
    setMetodoPago,
    activeTab,
    setActiveTab,
    actionLoading,
    cobrarLoading,
    modoDivision,
    setModoDivision,
    pagosRegistrados,
    importePago,
    setImportePago,
    metodoPagoDivision,
    setMetodoPagoDivision,
    loadingPago,
    divisionError,
    setDivisionError,
    numPartesInput,
    setNumPartesInput,
    borradorPartesPagos,
    setBorradorPartesPagos,
    liberarMesaLoading,
    productoNombrePorId,
    totalPagado,
    pendienteDivision,
    handleAddLinea,
    lineasAgrupadas,
    totalUnidadesComanda,
    handleRestarUnidadGrupo,
    handleCobrar,
    iniciarDivision,
    handleAnadirPagoDivision,
    handleEliminarPagoDivision,
    handleCompletarDivision,
    rellenarPendiente,
    handleDividirRestanteEnPartes,
    handleConfirmarPartesPagos,
    lineas,
    handleLiberarMesa,
  } = useTicketTPV()

  const mesaIdShort = mesaId?.slice(0, 8) ?? '—'

  if (loading) {
    return <Loader />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f6f9] dark:bg-[#0f1117]">
      <header className="h-header-safe sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-[#e2e5ed] bg-white px-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <button
          type="button"
          onClick={() => navigate('/mesas')}
          className="flex items-center gap-1 text-[#6b7280] hover:text-[#111827] dark:text-[#8b90a7] dark:hover:text-[#e8eaf0]"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
          <span className="text-[15px]">Sala</span>
        </button>
        <span className="flex-1 text-center text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
          TPV · Mesa {mesaIdShort}
        </span>
      </header>

      {error ? (
        error === MESA_OCUPADA_SIN_TICKET_MSG ? (
          <TpvMesaOcupadaAlert
            message={error}
            liberarMesaLoading={liberarMesaLoading}
            onLiberarMesa={handleLiberarMesa}
            onVolverSala={() => navigate('/mesas')}
          />
        ) : (
          <div
            className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        )
      ) : null}

      <div className="flex h-12 shrink-0 border-b border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('carta')}
          className={`flex flex-1 items-center justify-center gap-2 text-[14px] font-medium ${
            activeTab === 'carta'
              ? 'border-b-2 border-amber-500 text-amber-500'
              : 'text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          <ChefHat size={16} strokeWidth={1.5} />
          Carta
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ticket')}
          className={`flex flex-1 items-center justify-center gap-2 text-[14px] font-medium ${
            activeTab === 'ticket'
              ? 'border-b-2 border-amber-500 text-amber-500'
              : 'text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          <ShoppingCart size={16} strokeWidth={1.5} />
          Ticket ({totalUnidadesComanda})
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Columna carta */}
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#1a1d27] ${
            activeTab === 'carta' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <CartaPanel
            categorias={categorias}
            categActiva={categActiva}
            setCategActiva={setCategActiva}
            productosActivos={productosActivos}
            handleAddLinea={handleAddLinea}
            actionLoading={actionLoading}
            ticket={ticket}
          />
        </div>

        {/* Columna ticket: altura limitada + scroll interno (comanda + cobro) */}
        <div
          className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border-l border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:h-full md:w-80 md:shrink-0 md:flex-none lg:w-96 ${
            activeTab === 'ticket' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="shrink-0 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Comanda
            </h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <LineasTicket
              lineas={lineas}
              lineasAgrupadas={lineasAgrupadas}
              productoNombrePorId={productoNombrePorId}
              actionLoading={actionLoading}
              handleRestarUnidadGrupo={handleRestarUnidadGrupo}
            />
            <div className="shrink-0 border-t border-[#e2e5ed] p-4 dark:border-[#2e3347]">
              <CobroModal
                ticket={ticket}
                lineas={lineas}
                divisionError={divisionError}
                modoDivision={modoDivision}
                setModoDivision={setModoDivision}
                setDivisionError={setDivisionError}
                metodoPago={metodoPago}
                setMetodoPago={setMetodoPago}
                cobrarLoading={cobrarLoading}
                handleCobrar={handleCobrar}
                iniciarDivision={iniciarDivision}
                importePago={importePago}
                setImportePago={setImportePago}
                metodoPagoDivision={metodoPagoDivision}
                setMetodoPagoDivision={setMetodoPagoDivision}
                loadingPago={loadingPago}
                handleAnadirPagoDivision={handleAnadirPagoDivision}
                rellenarPendiente={rellenarPendiente}
                pendienteDivision={pendienteDivision}
                numPartesInput={numPartesInput}
                setNumPartesInput={setNumPartesInput}
                handleDividirRestanteEnPartes={handleDividirRestanteEnPartes}
                borradorPartesPagos={borradorPartesPagos}
                setBorradorPartesPagos={setBorradorPartesPagos}
                handleConfirmarPartesPagos={handleConfirmarPartesPagos}
                pagosRegistrados={pagosRegistrados}
                handleEliminarPagoDivision={handleEliminarPagoDivision}
                handleCompletarDivision={handleCompletarDivision}
                totalPagado={totalPagado}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
