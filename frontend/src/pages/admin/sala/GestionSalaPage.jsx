import MesaAdminModal from './components/MesaAdminModal'
import MesasAdminTable from './components/MesasAdminTable'
import { useMesasAdmin } from './hooks/useMesasAdmin'

export default function GestionSalaPage() {
  const m = useMesasAdmin()

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <MesasAdminTable
        loading={m.loading}
        mesas={m.mesas}
        error={m.error}
        feedback={m.feedback}
        resumen={m.resumen}
        openNueva={m.openNueva}
        openEditar={m.openEditar}
        eliminarMesa={m.eliminarMesa}
        rowBusyClass={m.rowBusyClass}
      />

      <MesaAdminModal
        modalMesa={m.modalMesa}
        formMesa={m.formMesa}
        setFormMesa={m.setFormMesa}
        formError={m.formError}
        saving={m.saving}
        cerrarModal={m.cerrarModal}
        guardarMesa={m.guardarMesa}
      />
    </div>
  )
}
