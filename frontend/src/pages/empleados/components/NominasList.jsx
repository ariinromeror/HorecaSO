import { Eye } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  MESES,
  NOMINAS_BTN_GHOST,
  NOMINAS_SURFACE,
  eur,
} from '../constants'

export default function NominasList({
  empleadoId,
  nombreEmpleado,
  loadingHist,
  historial,
  cargarEnPanel,
  abrirDetalle,
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
        Historial de nóminas
        {empleadoId
          ? ` — ${nombreEmpleado(empleadoId)}`
          : ' (selecciona empleado)'}
      </h2>

      {!empleadoId ? (
        <EmptyState message="Selecciona un empleado para ver su historial" />
      ) : loadingHist ? (
        <Loader />
      ) : historial.length === 0 ? (
        <EmptyState message="No hay nóminas registradas para este empleado" />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${NOMINAS_SURFACE}`}>
            <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold">Empleado</th>
                  <th className="px-4 py-3 font-semibold">Mes / Año</th>
                  <th className="px-4 py-3 font-semibold">Bruto</th>
                  <th className="px-4 py-3 font-semibold">Líquido</th>
                  <th className="px-4 py-3 font-semibold">Coste empresa</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((n) => (
                  <tr
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => cargarEnPanel(n)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        cargarEnPanel(n)
                      }
                    }}
                    className="cursor-pointer border-b border-[#e2e5ed] hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:hover:bg-[#0f1117]"
                  >
                    <td className="px-4 py-3">
                      {nombreEmpleado(n.empleado_id)}
                    </td>
                    <td className="px-4 py-3">
                      {MESES[n.mes - 1]} {n.anio}
                    </td>
                    <td className="px-4 py-3">{eur(n.total_devengos)}</td>
                    <td className="px-4 py-3">{eur(n.liquido)}</td>
                    <td className="px-4 py-3">
                      {eur(n.coste_total_empresa)}
                    </td>
                    <td className="px-4 py-3">
                      {n.pagada ? (
                        <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Pagada
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirDetalle(n)
                        }}
                        className={NOMINAS_BTN_GHOST}
                      >
                        <Eye size={18} strokeWidth={1.5} />
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {historial.map((n) => (
              <div key={n.id} className={`${NOMINAS_SURFACE} p-4`}>
                <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  {nombreEmpleado(n.empleado_id)}
                </p>
                <p className="mt-1 text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                  {MESES[n.mes - 1]} {n.anio}
                </p>
                <dl className="mt-3 space-y-1 text-[14px]">
                  <div className="flex justify-between">
                    <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                      Bruto
                    </dt>
                    <dd>{eur(n.total_devengos)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                      Líquido
                    </dt>
                    <dd className="font-medium text-amber-500">
                      {eur(n.liquido)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                      Coste empresa
                    </dt>
                    <dd>{eur(n.coste_total_empresa)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between">
                  {n.pagada ? (
                    <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Pagada
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Pendiente
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      abrirDetalle(n)
                    }}
                    className={NOMINAS_BTN_GHOST}
                  >
                    <Eye size={18} strokeWidth={1.5} />
                    Detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
