import { Navigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import Loader from '../../components/shared/Loader'
import { ROLES_EMPLEADOS, EMPLEADOS_BTN_PRIMARY } from './constants'
import EmpleadoModal from './components/EmpleadoModal'
import EmpleadosTable from './components/EmpleadosTable'
import { useEmpleados } from './hooks/useEmpleados'

export default function EmpleadosPage() {
  const e = useEmpleados()

  if (e.authLoading) {
    return <Loader />
  }

  if (e.user && !ROLES_EMPLEADOS.includes(e.user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-amber-500" size={28} strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Empleados
          </h1>
        </div>
        <button
          type="button"
          onClick={e.abrirNuevo}
          className={EMPLEADOS_BTN_PRIMARY}
        >
          Nuevo empleado
        </button>
      </header>

      <EmpleadosTable
        loading={e.loading}
        empleados={e.empleados}
        error={e.error}
        buscarInput={e.buscarInput}
        setBuscarInput={e.setBuscarInput}
        filtroActivo={e.filtroActivo}
        setFiltroActivo={e.setFiltroActivo}
        filtroCargo={e.filtroCargo}
        setFiltroCargo={e.setFiltroCargo}
        cargosUnicos={e.cargosUnicos}
        abrirEditar={e.abrirEditar}
      />

      <EmpleadoModal
        modal={e.modal}
        form={e.form}
        setForm={e.setForm}
        modalLoading={e.modalLoading}
        modalError={e.modalError}
        saving={e.saving}
        cerrarModal={e.cerrarModal}
        guardar={e.guardar}
      />
    </div>
  )
}
