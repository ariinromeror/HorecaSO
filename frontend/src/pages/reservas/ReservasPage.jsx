import { Navigate } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import Loader from '../../components/shared/Loader'
import ListaEsperaPanel from './components/ListaEsperaPanel'
import ReservaAcciones from './components/ReservaAcciones'
import ReservaModal from './components/ReservaModal'
import ReservasList from './components/ReservasList'
import { BTN_PRIMARY, PAGE_BG, ROLES_ACCESO } from './constants'
import { useReservas } from './hooks/useReservas'

export default function ReservasPage() {
  const {
    authLoading,
    user,
    mainTab,
    setMainTab,
    filtroFecha,
    setFiltroFecha,
    filtroEstado,
    setFiltroEstado,
    reservas,
    loadingReservas,
    errorReservas,
    lista,
    loadingLista,
    errorLista,
    listaTick,
    modalReserva,
    formReserva,
    setFormReserva,
    modalReservaError,
    savingReserva,
    modalEstado,
    patchingEstado,
    formLista,
    setFormLista,
    addingLista,
    patchingListaId,
    abrirNuevaReserva,
    abrirEditarReserva,
    cerrarModalReserva,
    guardarReserva,
    abrirModalEstado,
    cerrarModalEstado,
    aplicarEstadoReserva,
    confirmarRapido,
    anadirLista,
    patchListaEstado,
  } = useReservas()

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_ACCESO.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div
      className={`${PAGE_BG} min-w-0 overflow-x-hidden px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck
            className="shrink-0 text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Reservas
          </h1>
        </div>
        <button
          type="button"
          onClick={abrirNuevaReserva}
          className={`${BTN_PRIMARY} w-full sm:w-auto`}
        >
          Nueva reserva
        </button>
      </header>

      <div className="mb-6 flex gap-2 border-b border-[#e2e5ed] dark:border-[#2e3347]">
        <button
          type="button"
          onClick={() => setMainTab('reservas')}
          className={`h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors ${
            mainTab === 'reservas'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Reservas
        </button>
        <button
          type="button"
          onClick={() => setMainTab('lista')}
          className={`h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors ${
            mainTab === 'lista'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Lista de espera
        </button>
      </div>

      {mainTab === 'reservas' ? (
        <ReservasList
          filtroFecha={filtroFecha}
          setFiltroFecha={setFiltroFecha}
          filtroEstado={filtroEstado}
          setFiltroEstado={setFiltroEstado}
          errorReservas={errorReservas}
          loadingReservas={loadingReservas}
          reservas={reservas}
          abrirModalEstado={abrirModalEstado}
          abrirEditarReserva={abrirEditarReserva}
          confirmarRapido={confirmarRapido}
        />
      ) : (
        <ListaEsperaPanel
          listaTick={listaTick}
          formLista={formLista}
          setFormLista={setFormLista}
          anadirLista={anadirLista}
          addingLista={addingLista}
          errorLista={errorLista}
          loadingLista={loadingLista}
          lista={lista}
          patchingListaId={patchingListaId}
          patchListaEstado={patchListaEstado}
        />
      )}

      <ReservaModal
        modalReserva={modalReserva}
        modalReservaError={modalReservaError}
        formReserva={formReserva}
        setFormReserva={setFormReserva}
        savingReserva={savingReserva}
        cerrarModalReserva={cerrarModalReserva}
        guardarReserva={guardarReserva}
      />

      <ReservaAcciones
        modalEstado={modalEstado}
        patchingEstado={patchingEstado}
        aplicarEstadoReserva={aplicarEstadoReserva}
        cerrarModalEstado={cerrarModalEstado}
      />
    </div>
  )
}
