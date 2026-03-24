import { Navigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import Loader from '../../components/shared/Loader'
import ConsumoModal from './components/ConsumoModal'
import LoteModal from './components/LoteModal'
import LotesTable from './components/LotesTable'
import ValoracionPanel from './components/ValoracionPanel'
import { PAGE_BG_FIFO, ROLES_ACCESO_FIFO, TAB_BTN_FIFO } from './fifoConstants'
import { useFIFO } from './hooks/useFIFO'

export default function FIFOPage() {
  const fifo = useFIFO()

  if (fifo.authLoading) {
    return <Loader />
  }

  if (fifo.user && !ROLES_ACCESO_FIFO.includes(fifo.user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div
      className={`${PAGE_BG_FIFO} min-w-0 overflow-x-hidden px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Layers
            className="shrink-0 text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Stock FIFO
          </h1>
        </div>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[#e2e5ed] pb-px dark:border-[#2e3347]">
        <button
          type="button"
          onClick={() => fifo.setMainTab('lotes')}
          className={`${TAB_BTN_FIFO} shrink-0 ${
            fifo.mainTab === 'lotes'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Lotes
        </button>
        <button
          type="button"
          onClick={() => fifo.setMainTab('alertas')}
          className={`${TAB_BTN_FIFO} shrink-0 ${
            fifo.mainTab === 'alertas'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Alertas caducidad
        </button>
        <button
          type="button"
          onClick={() => fifo.setMainTab('valoracion')}
          className={`${TAB_BTN_FIFO} shrink-0 ${
            fifo.mainTab === 'valoracion'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Valoración stock
        </button>
      </div>

      {fifo.mainTab === 'lotes' || fifo.mainTab === 'alertas' ? (
        <LotesTable
          mainTab={fifo.mainTab}
          filtroArticuloId={fifo.filtroArticuloId}
          setFiltroArticuloId={fifo.setFiltroArticuloId}
          soloActivos={fifo.soloActivos}
          setSoloActivos={fifo.setSoloActivos}
          loadingArticulos={fifo.loadingArticulos}
          articulos={fifo.articulos}
          setFormNuevo={fifo.setFormNuevo}
          setModalNuevoErr={fifo.setModalNuevoErr}
          setModalNuevo={fifo.setModalNuevo}
          setFormConsumir={fifo.setFormConsumir}
          setModalConsumirErr={fifo.setModalConsumirErr}
          setModalConsumir={fifo.setModalConsumir}
          errorLotes={fifo.errorLotes}
          loadingLotes={fifo.loadingLotes}
          lotes={fifo.lotes}
          articuloLabel={fifo.articuloLabel}
          diasAlerta={fifo.diasAlerta}
          setDiasAlerta={fifo.setDiasAlerta}
          buscarAlertas={fifo.buscarAlertas}
          errorAlertas={fifo.errorAlertas}
          alertasBuscado={fifo.alertasBuscado}
          loadingAlertas={fifo.loadingAlertas}
          alertas={fifo.alertas}
        />
      ) : null}

      {fifo.mainTab === 'valoracion' ? (
        <ValoracionPanel
          errorValoracion={fifo.errorValoracion}
          loadingValoracion={fifo.loadingValoracion}
          valoracion={fifo.valoracion}
          totalValoracionTabla={fifo.totalValoracionTabla}
        />
      ) : null}

      <LoteModal
        modalNuevo={fifo.modalNuevo}
        setModalNuevo={fifo.setModalNuevo}
        formNuevo={fifo.formNuevo}
        setFormNuevo={fifo.setFormNuevo}
        modalNuevoErr={fifo.modalNuevoErr}
        articulos={fifo.articulos}
        guardarNuevoLote={fifo.guardarNuevoLote}
        savingNuevo={fifo.savingNuevo}
      />

      <ConsumoModal
        modalConsumir={fifo.modalConsumir}
        setModalConsumir={fifo.setModalConsumir}
        formConsumir={fifo.formConsumir}
        setFormConsumir={fifo.setFormConsumir}
        modalConsumirErr={fifo.modalConsumirErr}
        articulos={fifo.articulos}
        ejecutarConsumir={fifo.ejecutarConsumir}
        savingConsumir={fifo.savingConsumir}
      />
    </div>
  )
}
