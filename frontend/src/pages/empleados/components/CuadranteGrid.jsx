import { ChevronRight, Plus, X } from 'lucide-react'
import { CUADRANTE_SURFACE, DIAS_CORTO } from '../constants'
import {
  displayHora,
  formatDM,
  puestoPillClass,
  toISODate,
} from '../utils/cuadranteHelpers'

export default function CuadranteGrid({
  diasSemana,
  empleados,
  asignaciones,
  expandedMobile,
  asignacionesDeCelda,
  quitarAsignacion,
  abrirModalAdd,
  toggleExpand,
}) {
  return (
    <>
      <div
        className={`hidden overflow-x-auto md:block ${CUADRANTE_SURFACE} p-2 lg:p-4`}
      >
        <table className="horeca-body-text w-full min-w-[900px] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
              <th className="sticky left-0 z-10 min-w-[140px] bg-white px-2 py-2 font-semibold dark:bg-[#1a1d27]">
                Empleado
              </th>
              {diasSemana.map((dia, i) => (
                <th
                  key={toISODate(dia)}
                  className="px-1 py-2 text-center font-semibold text-[#111827] dark:text-[#e8eaf0]"
                >
                  <div>{DIAS_CORTO[i]}</div>
                  <div className="text-[12px] font-normal text-[#6b7280] dark:text-[#8b90a7]">
                    {formatDM(dia)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
              >
                <td className="sticky left-0 z-10 bg-white px-2 py-2 font-medium text-[#111827] dark:bg-[#1a1d27] dark:text-[#e8eaf0]">
                  {emp.nombre_empleado || emp.nombre_completo || emp.id}
                </td>
                {diasSemana.map((dia) => {
                  const f = toISODate(dia)
                  const celdas = asignacionesDeCelda(emp.id, f)
                  return (
                    <td key={f} className="align-top px-1 py-2">
                      <div className="flex min-h-[72px] flex-col gap-1">
                        {celdas.map((a) => (
                          <div
                            key={a._key || a.id}
                            className={`group relative flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium ${puestoPillClass(a.puesto)}`}
                          >
                            <span className="flex-1 truncate">
                              {displayHora(a.hora_inicio)}-
                              {displayHora(a.hora_fin)}{' '}
                              <span className="opacity-80">
                                {a.puesto || '—'}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                quitarAsignacion(a._key || a.id)
                              }
                              className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
                              aria-label="Quitar turno"
                            >
                              <X size={14} strokeWidth={1.5} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => abrirModalAdd(emp.id, f)}
                          className="mt-auto inline-flex h-8 w-8 items-center justify-center self-center rounded-lg border border-dashed border-[#e2e5ed] text-[#6b7280] dark:border-[#2e3347] dark:text-[#8b90a7]"
                          aria-label="Añadir turno"
                        >
                          <Plus size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {empleados.map((emp) => {
          const exp = expandedMobile[emp.id]
          const turnosEmp = asignaciones
            .filter((a) => String(a.empleado_id) === String(emp.id))
            .sort(
              (a, b) =>
                String(a.fecha).localeCompare(String(b.fecha)) ||
                String(a.hora_inicio).localeCompare(String(b.hora_inicio))
            )
          return (
            <div key={emp.id} className={CUADRANTE_SURFACE}>
              <button
                type="button"
                onClick={() => toggleExpand(emp.id)}
                className="flex w-full min-h-[48px] items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  {emp.nombre_empleado || emp.nombre_completo || emp.id}
                </span>
                <ChevronRight
                  size={20}
                  strokeWidth={1.5}
                  className={`shrink-0 text-[#6b7280] transition-transform dark:text-[#8b90a7] ${exp ? 'rotate-90' : ''}`}
                />
              </button>
              {exp ? (
                <div className="border-t border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]">
                  {turnosEmp.length === 0 ? (
                    <p className="text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                      Sin turnos esta semana
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {turnosEmp.map((a) => (
                        <li
                          key={a._key || a.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e5ed] px-3 py-2 dark:border-[#2e3347]"
                        >
                          <div>
                            <p className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                              {String(a.fecha).slice(0, 10)
                                .split('-')
                                .reverse()
                                .join('/')}
                            </p>
                            <p
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[13px] ${puestoPillClass(a.puesto)}`}
                            >
                              {displayHora(a.hora_inicio)} -{' '}
                              {displayHora(a.hora_fin)} · {a.puesto || '—'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              quitarAsignacion(a._key || a.id)
                            }
                            className="shrink-0 rounded-lg p-2 text-red-600 dark:text-red-400"
                            aria-label="Quitar"
                          >
                            <X size={18} strokeWidth={1.5} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {diasSemana.map((dia) => {
                      const f = toISODate(dia)
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => abrirModalAdd(emp.id, f)}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[#e2e5ed] px-3 py-2 text-[13px] dark:border-[#2e3347]"
                        >
                          <Plus size={16} strokeWidth={1.5} />
                          {DIAS_CORTO[diasSemana.findIndex((d) => toISODate(d) === f)]}{' '}
                          {formatDM(dia)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </>
  )
}
