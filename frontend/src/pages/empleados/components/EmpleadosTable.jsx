import { DollarSign, Pencil } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  EMPLEADOS_BTN_PRIMARY,
  EMPLEADOS_INPUT,
  EMPLEADOS_SELECT,
  EMPLEADOS_SURFACE,
  formatEuroEmpleado,
} from '../constants'

export default function EmpleadosTable({
  loading,
  empleados,
  error,
  buscarInput,
  setBuscarInput,
  filtroActivo,
  setFiltroActivo,
  filtroCargo,
  setFiltroCargo,
  cargosUnicos,
  abrirEditar,
}) {
  return (
    <>
      {error ? (
        <p className="mb-4 text-[15px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div
        className={`mb-6 flex min-w-0 flex-col gap-3 md:flex-row md:flex-wrap md:items-center ${EMPLEADOS_SURFACE} p-4`}
      >
        <input
          type="search"
          value={buscarInput}
          onChange={(e) => setBuscarInput(e.target.value)}
          placeholder="Buscar…"
          className={`${EMPLEADOS_INPUT} min-h-[48px] flex-1 md:min-w-[200px]`}
          aria-label="Buscar empleados"
        />
        <select
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
          className={`${EMPLEADOS_SELECT} min-h-[48px] md:w-44`}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select
          value={filtroCargo}
          onChange={(e) => setFiltroCargo(e.target.value)}
          className={`${EMPLEADOS_SELECT} min-h-[48px] md:w-56`}
          aria-label="Filtrar por cargo"
        >
          <option value="">Todos los cargos</option>
          {cargosUnicos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : empleados.length === 0 ? (
        <EmptyState message="No hay empleados con los filtros actuales" />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${EMPLEADOS_SURFACE}`}>
            <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Empleado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    DNI
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Contrato
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Jornada
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Salario bruto
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {e.nombre_empleado || '—'}
                      </div>
                      <div className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                        {e.cargo || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {e.dni || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {e.contrato || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {e.jornada_horas != null ? `${e.jornada_horas} h` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {formatEuroEmpleado(e.salario_bruto_mensual)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          e.activo
                            ? 'inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-sm font-medium text-emerald-700 dark:text-emerald-400'
                            : 'inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-sm font-medium text-red-700 dark:text-red-400'
                        }
                      >
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => abrirEditar(e)}
                        className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] text-amber-500 dark:border-[#2e3347]"
                        aria-label={`Editar ${e.nombre_empleado || 'empleado'}`}
                      >
                        <Pencil size={18} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {empleados.map((e) => (
              <div
                key={e.id}
                className={`${EMPLEADOS_SURFACE} flex flex-col gap-3 p-4`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    {e.nombre_empleado || '—'}
                  </div>
                  <span
                    className={
                      e.activo
                        ? 'shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                        : 'shrink-0 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400'
                    }
                  >
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {[e.cargo, e.contrato].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="flex items-center gap-2 text-[#111827] dark:text-[#e8eaf0]">
                  <DollarSign
                    size={20}
                    strokeWidth={1.5}
                    className="text-amber-500"
                  />
                  <span className="font-medium">
                    {formatEuroEmpleado(e.salario_bruto_mensual)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => abrirEditar(e)}
                  className={EMPLEADOS_BTN_PRIMARY}
                >
                  <Pencil size={18} strokeWidth={1.5} />
                  Editar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
