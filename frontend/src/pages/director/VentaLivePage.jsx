import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import VentaLiveCards from './components/VentaLiveCards'
import VentaLiveTable from './components/VentaLiveTable'
import { useVentaLivePolling } from './hooks/useVentaLivePolling'

export default function VentaLivePage() {
  const navigate = useNavigate()
  const v = useVentaLivePolling()

  const goTpv = (id) => navigate(`/tpv/${id}`)

  if (v.initialLoad && !v.dashboard && !v.error) {
    return <Loader />
  }

  if (v.error && !v.dashboard) {
    return <EmptyState message={v.error} />
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-[#0f1117]">
      <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-[#e2e5ed] pb-4 dark:border-[#2e3347]">
        <Activity
          size={28}
          strokeWidth={1.5}
          className="text-amber-500"
          aria-hidden
        />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Venta Live
        </h1>
        <div className="ml-auto flex items-center gap-2 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              v.isRefreshing
                ? 'animate-pulse bg-emerald-500'
                : 'bg-[#9ca3af] dark:bg-[#5a5f7a]'
            }`}
            aria-hidden
          />
          <span>
            Actualizado hace {v.secondsAgo} segundo{v.secondsAgo === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      {v.error ? (
        <div
          className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[15px] text-amber-800 dark:text-amber-200"
          role="status"
        >
          {v.error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <VentaLiveCards
          ventasHoy={v.ventasHoy}
          mesasActivas={v.mesasActivas}
          goTpv={goTpv}
          topProductos={v.topProductos}
          maxCantidad={v.maxCantidad}
        />
        <VentaLiveTable
          ticketsDia={v.ticketsDia}
          abrirDetalleTicket={v.abrirDetalleTicket}
          panelAbierto={v.panelAbierto}
          cerrarPanel={v.cerrarPanel}
          panelAnimIn={v.panelAnimIn}
          ticketDetalle={v.ticketDetalle}
          panelTicketId={v.panelTicketId}
          loadingDetalle={v.loadingDetalle}
          detalleError={v.detalleError}
          lineasSubtotalSum={v.lineasSubtotalSum}
          mostrarPagosRegistrados={v.mostrarPagosRegistrados}
        />
      </div>
    </div>
  )
}
