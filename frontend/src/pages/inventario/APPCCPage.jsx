import { Navigate } from 'react-router-dom'
import Loader from '../../components/shared/Loader'
import NoConformidadesPanel from './components/NoConformidadesPanel'
import RegistroAPPCCModal from './components/RegistroAPPCCModal'
import RegistrosAPPCCTable from './components/RegistrosAPPCCTable'
import ResumenDiarioPanel from './components/ResumenDiarioPanel'
import {
  BTN_PRIMARY_APPCC,
  PAGE_BG_APPCC,
  ROLES_ACCESO_APPCC,
  TAB_BTN_APPCC,
} from './appccConstants'
import { useAPPCC } from './hooks/useAPPCC'

export default function APPCCPage() {
  const a = useAPPCC()

  if (a.authLoading) {
    return <Loader />
  }

  if (a.user && !ROLES_ACCESO_APPCC.includes(a.user.rol)) {
    return <Navigate to="/menu" replace />
  }

  return (
    <div
      className={`${PAGE_BG_APPCC} text-[15px] text-[#111827] dark:text-[#e8eaf0]`}
    >
      <header className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={a.abrirModal}
          className={`${BTN_PRIMARY_APPCC} w-full sm:w-auto`}
        >
          Nuevo registro
        </button>
      </header>

      <ResumenDiarioPanel
        errorResumen={a.errorResumen}
        loadingResumen={a.loadingResumen}
        resumen={a.resumen}
      />

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[#e2e5ed] dark:border-[#2e3347] pb-px">
        <button
          type="button"
          onClick={() => a.setMainTab('registros')}
          className={`${TAB_BTN_APPCC} shrink-0 ${
            a.mainTab === 'registros'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Registros
        </button>
        <button
          type="button"
          onClick={() => a.setMainTab('no-conformes')}
          className={`${TAB_BTN_APPCC} shrink-0 ${
            a.mainTab === 'no-conformes'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          No conformidades
        </button>
      </div>

      {a.mainTab === 'registros' ? (
        <RegistrosAPPCCTable
          filtroTipo={a.filtroTipo}
          setFiltroTipo={a.setFiltroTipo}
          filtroDesde={a.filtroDesde}
          setFiltroDesde={a.setFiltroDesde}
          filtroHasta={a.filtroHasta}
          setFiltroHasta={a.setFiltroHasta}
          filtroConforme={a.filtroConforme}
          setFiltroConforme={a.setFiltroConforme}
          cargarRegistros={a.cargarRegistros}
          loadingReg={a.loadingReg}
          errorReg={a.errorReg}
          registros={a.registros}
        />
      ) : null}

      {a.mainTab === 'no-conformes' ? (
        <NoConformidadesPanel
          puedeVerNoConformesDetalle={a.puedeVerNoConformesDetalle}
          ncDesde={a.ncDesde}
          setNcDesde={a.setNcDesde}
          ncHasta={a.ncHasta}
          setNcHasta={a.setNcHasta}
          cargarNoConformes={a.cargarNoConformes}
          loadingNc={a.loadingNc}
          errorNc={a.errorNc}
          noConformes={a.noConformes}
        />
      ) : null}

      <RegistroAPPCCModal
        modalOpen={a.modalOpen}
        modalError={a.modalError}
        form={a.form}
        setForm={a.setForm}
        cerrarModal={a.cerrarModal}
        guardarRegistro={a.guardarRegistro}
        saving={a.saving}
      />
    </div>
  )
}
