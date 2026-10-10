import {
  ArrowLeft,
  ChefHat,
  Printer,
  ShoppingCart,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import CartaPanel from './components/CartaPanel'
import CobroModal from './components/CobroModal'
import LineasTicket from './components/LineasTicket'
import TicketPrintView, {
  printViaAgentOrBrowser,
} from './components/TicketPrintView'
import TpvMesaOcupadaAlert from './components/TpvMesaOcupadaAlert'
import { MESA_OCUPADA_SIN_TICKET_MSG } from './constants'
import { useTicketTPV } from './hooks/useTicketTPV'

export default function TPVPage() {
  const { user, refreshProfile } = useAuth()
  const {
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
    handlePatchNotaLinea,
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
    feedback,
  } = useTicketTPV()

  const [printType, setPrintType] = useState('ticket')
  const mesaLabel =
    ticket?.mesa_numero != null && ticket.mesa_numero !== ''
      ? String(ticket.mesa_numero)
      : '—'
  const tenantPrint = ticket?.tenant_print || null
  const tenantNombre =
    (tenantPrint?.razon_social && String(tenantPrint.razon_social).trim()) ||
    (tenantPrint?.nombre && String(tenantPrint.nombre).trim()) ||
    (ticket?.tenant_nombre && String(ticket.tenant_nombre).trim()) ||
    (user?.tenant_nombre && String(user.tenant_nombre).trim()) ||
    'HorecaSO'

  useEffect(() => {
    if (user?.tenant_nombre || tenantPrint?.nombre) return undefined
    let cancelled = false
    ;(async () => {
      try {
        await refreshProfile()
      } catch {
        if (!cancelled) {
          /* perfil opcional para impresión */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.tenant_nombre, tenantPrint?.nombre, refreshProfile])

  const runPrint = async (type) => {
    setPrintType(type)
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    )
    await printViaAgentOrBrowser({
      tipo: type,
      mesa: mesaLabel,
      tenant: tenantNombre,
      tenant_print: tenantPrint,
      total: Number(ticket?.total) || 0,
      lineas: (lineas || []).map((ln) => ({
        cantidad: ln.cantidad,
        nombre:
          productoNombrePorId?.get?.(String(ln.producto_id)) ||
          ln.nombre ||
          'Producto',
        subtotal: Number(ln.subtotal) || 0,
        nota: ln.nota || null,
      })),
    })
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f6f9] dark:bg-[#0f1117]">
      <TicketPrintView
        type={printType}
        mesaLabel={mesaLabel}
        lineas={lineas}
        productoNombrePorId={productoNombrePorId}
        total={ticket?.total}
        qrUrl={ticket?.verifactu_qr_url}
        tenantNombre={tenantNombre}
        tenantPrint={tenantPrint}
        numeroSerie={ticket?.verifactu_numero_serie}
        anchoMm={80}
      />

      <header className="h-header-safe sticky top-0 z-20 grid shrink-0 grid-cols-[3rem_1fr_3rem] items-center border-b border-[#e2e5ed] bg-white px-2 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:px-3">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => navigate('/mesas')}
            className="flex h-12 w-12 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f0f2f5] hover:text-[#111827] dark:text-[#8b90a7] dark:hover:bg-[#222536] dark:hover:text-[#e8eaf0]"
            aria-label="Volver a sala"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
            <span className="sr-only">Sala</span>
          </button>
        </div>
        <span className="min-w-0 truncate px-1 text-center text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
          TPV · Mesa {mesaLabel}
        </span>
        <div className="w-12" aria-hidden />
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

      {feedback ? (
        <div
          className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400"
          role="status"
        >
          {feedback}
        </div>
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

        <div
          className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border-l border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27] md:h-full md:w-80 md:shrink-0 md:flex-none lg:w-96 ${
            activeTab === 'ticket' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="shrink-0 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Comanda
            </h2>
            <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
              Icono de nota: «sin azúcar», alergias… Se imprime en la comanda.
            </p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <LineasTicket
              lineas={lineas}
              lineasAgrupadas={lineasAgrupadas}
              productoNombrePorId={productoNombrePorId}
              actionLoading={actionLoading}
              handleRestarUnidadGrupo={handleRestarUnidadGrupo}
              handlePatchNotaLinea={handlePatchNotaLinea}
            />
            <div className="shrink-0 border-t border-[#e2e5ed] p-4 dark:border-[#2e3347]">
              <button
                type="button"
                disabled={!lineas.length}
                onClick={() => runPrint('comanda')}
                className="mb-3 flex h-auto min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-[#e2e5ed] bg-white px-3 py-2 text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Printer size={18} strokeWidth={1.5} />
                  Comanda cocina
                </span>
                <span className="text-xs font-normal text-[#6b7280] dark:text-[#8b90a7]">
                  Sin precios · cocina/barra
                </span>
              </button>
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
                productoNombrePorId={productoNombrePorId}
                mesaLabel={mesaLabel}
                onPrintComanda={() => runPrint('comanda')}
                onPrintTicket={() => runPrint('ticket')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
