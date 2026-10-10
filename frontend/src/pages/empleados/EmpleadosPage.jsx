import { Navigate } from 'react-router-dom'
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
    return <Navigate to="/menu" replace />
  }

  return (
    <div className="min-h-full text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex justify-end">
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
