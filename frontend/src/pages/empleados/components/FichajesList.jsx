import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  FICHAJES_INPUT,
  FICHAJES_SELECT,
  FICHAJES_SURFACE,
} from '../constants'

export default function FichajesList({
  empleados,
  fechaHistorial,
  setFechaHistorial,
  empleadoHistorial,
  setEmpleadoHistorial,
  errorHist,
  turnosForbidden,
  loadingHist,
  turnosHistorial,
  formatHora,
  formatHoras,
  fechaTurnoISO,
}) {
  return (
    <section className={FICHAJES_SURFACE}>
      <div className="border-b border-[#e2e5ed] p-4 dark:border-[#2e3347] md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Historial de turnos
        </h2>
        <div className="flex min-w-0 flex-col gap-3 overflow-x-auto md:flex-row md:flex-wrap md:items-end">
          <label className="min-w-0 w-full flex-1 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:min-w-[12rem]">
            Empleado
            <select
              value={empleadoHistorial}
              onChange={(e) => setEmpleadoHistorial(e.target.value)}
              className={`${FICHAJES_SELECT} mt-1`}
            >
              <option value="">Todos</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_empleado || e.nombre_completo || e.id}
                </option>
              ))}
            </select>
          </label>
          <label className="w-full min-w-0 max-w-full text-[15px] text-[#111827] dark:text-[#e8eaf0] md:w-48 md:max-w-[12rem]">
            Fecha
            <input
              type="date"
              value={fechaHistorial}
              onChange={(e) => setFechaHistorial(e.target.value)}
              className={`${FICHAJES_INPUT} mt-1`}
            />
          </label>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {errorHist ? (
          <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
            {errorHist}
          </p>
        ) : null}
        {turnosForbidden && !errorHist ? (
          <p className="mb-3 text-[15px] text-amber-700 dark:text-amber-400">
            Tu rol no permite ver el historial de turnos (RDL 8/2019 — consulta
            a dirección).
          </p>
        ) : null}

        {loadingHist ? (
          <Loader />
        ) : turnosHistorial.length === 0 ? (
          <EmptyState message="No hay turnos para esta fecha" />
        ) : (
          <>
            <div
              className={`hidden overflow-x-auto md:block ${FICHAJES_SURFACE} border-0`}
            >
              <table className="w-full min-w-[800px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                    <th className="px-3 py-2 font-semibold">Empleado</th>
                    <th className="px-3 py-2 font-semibold">Fecha</th>
                    <th className="px-3 py-2 font-semibold">Entrada</th>
                    <th className="px-3 py-2 font-semibold">Salida</th>
                    <th className="px-3 py-2 font-semibold">Horas</th>
                    <th className="px-3 py-2 font-semibold">Extra</th>
                    <th className="px-3 py-2 font-semibold">Incidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosHistorial.map((t) => {
                    const activo = t.hora_entrada && !t.hora_salida
                    const hx = Number(t.horas_extra || 0)
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="px-3 py-2">
                          {t.nombre_empleado || '—'}
                          {activo ? (
                            <span className="ml-2 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              En turno
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {fechaTurnoISO(t) || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {formatHora(t.hora_entrada)}
                        </td>
                        <td className="px-3 py-2">
                          {formatHora(t.hora_salida)}
                        </td>
                        <td className="px-3 py-2">
                          {formatHoras(t.horas_trabajadas)}
                        </td>
                        <td
                          className={`px-3 py-2 font-medium ${
                            hx > 0
                              ? 'text-amber-500'
                              : 'text-[#111827] dark:text-[#e8eaf0]'
                          }`}
                        >
                          {formatHoras(t.horas_extra)}
                        </td>
                        <td className="px-3 py-2 text-[#6b7280] dark:text-[#8b90a7]">
                          —
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {turnosHistorial.map((t) => {
                const activo = t.hora_entrada && !t.hora_salida
                const hx = Number(t.horas_extra || 0)
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-[#e2e5ed] bg-[#f4f6f9] p-4 dark:border-[#2e3347] dark:bg-[#0f1117]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        {t.nombre_empleado || '—'}
                      </span>
                      {activo ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          En turno
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                      {fechaTurnoISO(t)} · Entrada {formatHora(t.hora_entrada)}{' '}
                      · Salida {formatHora(t.hora_salida)}
                    </p>
                    <p className="mt-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                      Horas: {formatHoras(t.horas_trabajadas)}
                      <span
                        className={
                          hx > 0
                            ? ' ml-2 font-semibold text-amber-500'
                            : ' ml-2'
                        }
                      >
                        Extra: {formatHoras(t.horas_extra)}
                      </span>
                    </p>
                    <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                      Incidencia: —
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
