import { Navigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import Loader from '../../components/shared/Loader'
import ClienteModal from './components/ClienteModal'
import ClientesTable from './components/ClientesTable'
import HistorialPanel from './components/HistorialPanel'
import PuntosPanel from './components/PuntosPanel'
import { BTN_PRIMARY, PAGE_BG, ROLES_ACCESO } from './constants'
import { useClientes } from './hooks/useClientes'

export default function ClientesPage() {
  const {
    authLoading,
    user,
    buscarInput,
    setBuscarInput,
    puntosMin,
    setPuntosMin,
    clientes,
    loading,
    error,
    modalCliente,
    formCliente,
    setFormCliente,
    modalClienteError,
    savingCliente,
    modalHistorial,
    historialData,
    historialLoading,
    historialError,
    modalPuntos,
    puntosInput,
    setPuntosInput,
    motivoPuntos,
    setMotivoPuntos,
    puntosSaving,
    puntosError,
    abrirNuevo,
    abrirEditar,
    cerrarModalCliente,
    toggleAlergeno,
    guardarCliente,
    abrirHistorial,
    cerrarHistorial,
    abrirPuntos,
    cerrarPuntos,
    enviarPuntos,
  } = useClientes()

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_ACCESO.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div
      className={`${PAGE_BG} px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users
            className="shrink-0 text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Clientes
          </h1>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className={`${BTN_PRIMARY} w-full sm:w-auto`}
        >
          Nuevo cliente
        </button>
      </header>

      <ClientesTable
        buscarInput={buscarInput}
        setBuscarInput={setBuscarInput}
        puntosMin={puntosMin}
        setPuntosMin={setPuntosMin}
        error={error}
        loading={loading}
        clientes={clientes}
        abrirHistorial={abrirHistorial}
        abrirEditar={abrirEditar}
        abrirPuntos={abrirPuntos}
      />

      <ClienteModal
        modalCliente={modalCliente}
        modalClienteError={modalClienteError}
        formCliente={formCliente}
        setFormCliente={setFormCliente}
        savingCliente={savingCliente}
        cerrarModalCliente={cerrarModalCliente}
        guardarCliente={guardarCliente}
        toggleAlergeno={toggleAlergeno}
      />

      <HistorialPanel
        modalHistorial={modalHistorial}
        historialLoading={historialLoading}
        historialError={historialError}
        historialData={historialData}
        cerrarHistorial={cerrarHistorial}
      />

      <PuntosPanel
        modalPuntos={modalPuntos}
        puntosError={puntosError}
        puntosInput={puntosInput}
        setPuntosInput={setPuntosInput}
        motivoPuntos={motivoPuntos}
        setMotivoPuntos={setMotivoPuntos}
        puntosSaving={puntosSaving}
        enviarPuntos={enviarPuntos}
        cerrarPuntos={cerrarPuntos}
      />
    </div>
  )
}
