import { Navigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import Loader from '../../components/shared/Loader'
import { ROLES_FICHAJES } from './constants'
import FichajeAcciones from './components/FichajeAcciones'
import FichajesList from './components/FichajesList'
import { useFichajes } from './hooks/useFichajes'

export default function FichajesPage() {
  const f = useFichajes()

  if (f.authLoading) {
    return <Loader />
  }

  if (f.user && !ROLES_FICHAJES.includes(f.user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex items-center gap-3">
        <Clock className="text-amber-500" size={28} strokeWidth={1.5} />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Control Horario
        </h1>
      </header>

      <FichajeAcciones
        ficharAlLogin={f.ficharAlLogin}
        setFicharAlLoginState={f.setFicharAlLoginState}
        writeFicharAlLogin={f.writeFicharAlLogin}
        empleados={f.empleados}
        loadingEmp={f.loadingEmp}
        errorEmp={f.errorEmp}
        empleadoPanel={f.empleadoPanel}
        setEmpleadoPanel={f.setEmpleadoPanel}
        turnosForbidden={f.turnosForbidden}
        panelError={f.panelError}
        loadingPanel={f.loadingPanel}
        turnoActivoEfectivo={f.turnoActivoEfectivo}
        tiempoTranscurrido={f.tiempoTranscurrido}
        ficharEntrada={f.ficharEntrada}
        ficharSalida={f.ficharSalida}
        fichando={f.fichando}
        resumenFichaje={f.resumenFichaje}
        formatHora={f.formatHora}
        formatHoras={f.formatHoras}
      />

      <FichajesList
        empleados={f.empleados}
        fechaHistorial={f.fechaHistorial}
        setFechaHistorial={f.setFechaHistorial}
        empleadoHistorial={f.empleadoHistorial}
        setEmpleadoHistorial={f.setEmpleadoHistorial}
        errorHist={f.errorHist}
        turnosForbidden={f.turnosForbidden}
        loadingHist={f.loadingHist}
        turnosHistorial={f.turnosHistorial}
        formatHora={f.formatHora}
        formatHoras={f.formatHoras}
        fechaTurnoISO={f.fechaTurnoISO}
      />
    </div>
  )
}
