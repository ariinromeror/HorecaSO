import { Navigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { ROLES_CUADRANTE, CUADRANTE_BTN_PRIMARY, CUADRANTE_SURFACE } from './constants'
import CuadranteGrid from './components/CuadranteGrid'
import TurnoModal from './components/TurnoModal'
import { useCuadrante } from './hooks/useCuadrante'
import { formatDM } from './utils/cuadranteHelpers'

export default function CuadrantePage() {
  const c = useCuadrante()

  if (c.authLoading) {
    return <Loader />
  }

  if (c.user && !ROLES_CUADRANTE.includes(c.user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays
            className="text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Cuadrante Semanal
          </h1>
          {c.pendientesCount > 0 ? (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
              Sin publicar ({c.pendientesCount}{' '}
              {c.pendientesCount === 1 ? 'cambio' : 'cambios'})
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={c.publicarCuadrante}
          disabled={c.publishing || c.pendientesCount === 0}
          className={CUADRANTE_BTN_PRIMARY}
        >
          {c.publishing ? 'Publicando…' : 'Publicar cuadrante'}
        </button>
      </header>

      {c.publishError ? (
        <p className="mb-4 text-[15px] text-red-600 dark:text-red-400">
          {c.publishError}
        </p>
      ) : null}

      <div
        className={`mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between ${CUADRANTE_SURFACE} p-4`}
      >
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <button
            type="button"
            onClick={c.semanaAnterior}
            className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={c.semanaSiguiente}
            className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={22} strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-center text-[16px] font-semibold text-[#111827] dark:text-[#e8eaf0] sm:text-left">
          Semana del {formatDM(c.lunes)} al {formatDM(c.domingo)}
        </p>
      </div>

      {c.errorEmp ? (
        <p className="mb-3 text-red-600 dark:text-red-400">{c.errorEmp}</p>
      ) : null}
      {c.errorCuad ? (
        <p className="mb-3 text-red-600 dark:text-red-400">{c.errorCuad}</p>
      ) : null}

      {c.loadingEmp || c.loadingCuad ? (
        <Loader />
      ) : c.empleados.length === 0 ? (
        <EmptyState message="No hay empleados activos" />
      ) : (
        <CuadranteGrid
          diasSemana={c.diasSemana}
          empleados={c.empleados}
          asignaciones={c.asignaciones}
          expandedMobile={c.expandedMobile}
          asignacionesDeCelda={c.asignacionesDeCelda}
          quitarAsignacion={c.quitarAsignacion}
          abrirModalAdd={c.abrirModalAdd}
          toggleExpand={c.toggleExpand}
        />
      )}

      <TurnoModal
        modalAdd={c.modalAdd}
        modalForm={c.modalForm}
        setModalForm={c.setModalForm}
        modalErr={c.modalErr}
        cerrarModal={c.cerrarModal}
        guardarModalLocal={c.guardarModalLocal}
        nombreEmpleado={c.nombreEmpleado}
      />
    </div>
  )
}
