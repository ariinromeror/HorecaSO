import { Navigate } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import Loader from '../../components/shared/Loader'
import DesglosePanel from './components/DesglosePanel'
import NominaCalcularModal from './components/NominaCalcularModal'
import NominaDetalleModal from './components/NominaDetalleModal'
import NominasList from './components/NominasList'
import { NOMINAS_SURFACE, ROLES_NOMINAS } from './constants'
import { useNominas } from './hooks/useNominas'

export default function NominasPage() {
  const {
    authLoading,
    user,
    puedeAcceder,
    empleados,
    loadingEmp,
    errorEmp,
    empleadoId,
    setEmpleadoId,
    empleadoSel,
    mes,
    setMes,
    anio,
    setAnio,
    extrasOpen,
    setExtrasOpen,
    horasExtraCant,
    setHorasExtraCant,
    plusFest,
    setPlusFest,
    otrosDev,
    setOtrosDev,
    otrasDed,
    setOtrasDed,
    resultado,
    calcError,
    calculando,
    calcularNomina,
    historial,
    loadingHist,
    modalNomina,
    detalleModal,
    loadingDetalle,
    abrirDetalle,
    cerrarModal,
    tituloResultado,
    mostrarPanelDerecho,
    cargarEnPanel,
    nombreEmpleado,
  } = useNominas()

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_NOMINAS.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex items-center gap-3">
        <Receipt className="text-amber-500" size={28} strokeWidth={1.5} />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Nóminas
        </h1>
      </header>

      {errorEmp ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorEmp}</p>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <NominaCalcularModal
          loadingEmp={loadingEmp}
          empleados={empleados}
          empleadoId={empleadoId}
          setEmpleadoId={setEmpleadoId}
          empleadoSel={empleadoSel}
          mes={mes}
          setMes={setMes}
          anio={anio}
          setAnio={setAnio}
          extrasOpen={extrasOpen}
          setExtrasOpen={setExtrasOpen}
          horasExtraCant={horasExtraCant}
          setHorasExtraCant={setHorasExtraCant}
          plusFest={plusFest}
          setPlusFest={setPlusFest}
          otrosDev={otrosDev}
          setOtrosDev={setOtrosDev}
          otrasDed={otrasDed}
          setOtrasDed={setOtrasDed}
          calcError={calcError}
          calculando={calculando}
          calcularNomina={calcularNomina}
        />

        <div
          className={`min-w-0 ${mostrarPanelDerecho ? '' : 'hidden lg:block'}`}
        >
          {mostrarPanelDerecho ? (
            <DesglosePanel
              titulo={tituloResultado}
              desglose={resultado.desglose}
              nominaBase={resultado}
            />
          ) : (
            <div
              className={`${NOMINAS_SURFACE} flex min-h-[280px] items-center justify-center p-8 text-center text-[15px] text-[#6b7280] dark:text-[#8b90a7]`}
            >
              Calcula una nómina para ver el desglose aquí
            </div>
          )}
        </div>
      </div>

      <NominasList
        empleadoId={empleadoId}
        nombreEmpleado={nombreEmpleado}
        loadingHist={loadingHist}
        historial={historial}
        cargarEnPanel={cargarEnPanel}
        abrirDetalle={abrirDetalle}
      />

      <NominaDetalleModal
        modalNomina={modalNomina}
        loadingDetalle={loadingDetalle}
        detalleModal={detalleModal}
        cerrarModal={cerrarModal}
        nombreEmpleado={nombreEmpleado}
      />
    </div>
  )
}
