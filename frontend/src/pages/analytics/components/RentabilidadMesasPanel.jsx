import { Clock, Euro, Trophy, Users, Wallet } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import StatCard from '../../../components/shared/StatCard'
import { INPUT, SELECT, SURFACE, ZONAS, fmtEuro, fmtNum } from '../constants'

export default function RentabilidadMesasPanel({
  desdeRm,
  setDesdeRm,
  hastaRm,
  setHastaRm,
  zonaRm,
  setZonaRm,
  cargarRentabilidad,
  loadingRm,
  errorRm,
  dataRm,
  mesasRm,
  resRm,
}) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="w-full min-w-0 sm:max-w-[180px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Desde
          </label>
          <input
            type="date"
            value={desdeRm}
            onChange={(e) => setDesdeRm(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="w-full min-w-0 sm:max-w-[180px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Hasta
          </label>
          <input
            type="date"
            value={hastaRm}
            onChange={(e) => setHastaRm(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="w-full min-w-0 sm:max-w-[200px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Zona
          </label>
          <select
            value={zonaRm}
            onChange={(e) => setZonaRm(e.target.value)}
            className={SELECT}
          >
            {ZONAS.map((z) => (
              <option key={z.value || 'all'} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={cargarRentabilidad}
          className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
          disabled={loadingRm}
        >
          Actualizar
        </button>
      </div>

      {errorRm ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorRm}</p>
      ) : null}

      {loadingRm && !dataRm ? (
        <Loader />
      ) : (
        <>
          {resRm ? (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total visitas"
                value={String(resRm.total_visitas ?? 0)}
                Icon={Users}
                color="white"
              />
              <StatCard
                label="Ingreso total"
                value={fmtEuro(resRm.total_ingresos)}
                Icon={Wallet}
                color="amber"
              />
              <StatCard
                label="€/hora promedio"
                value={fmtEuro(resRm.ingreso_medio_hora)}
                Icon={Euro}
                color="white"
              />
              <StatCard
                label="Tiempo medio ocupación (min)"
                value={fmtNum(resRm.tiempo_medio_ocupacion_minutos, ' min')}
                Icon={Clock}
                color="white"
              />
            </div>
          ) : null}

          {mesasRm.length === 0 && !loadingRm ? (
            <EmptyState message="Sin datos de rentabilidad por mesa en el periodo" />
          ) : (
            <>
              <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
                <table className="horeca-body-text w-full min-w-[900px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Mesa
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Zona
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Visitas
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Ingreso total
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        €/hora medio
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        €/comensal medio
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        T. ocupación medio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesasRm.map((row, idx) => (
                      <tr
                        key={row.mesa_id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              #{row.mesa_numero}
                            </span>
                            {idx < 3 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                                <Trophy
                                  size={14}
                                  className="text-amber-500"
                                  strokeWidth={1.5}
                                />
                                Top 3
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">{row.zona || '—'}</td>
                        <td className="px-4 py-3">{row.total_visitas}</td>
                        <td className="px-4 py-3 font-medium">
                          {fmtEuro(row.total_ingresos)}
                        </td>
                        <td className="px-4 py-3">
                          {fmtEuro(row.ingreso_medio_hora)}
                        </td>
                        <td className="px-4 py-3">
                          {fmtEuro(row.ingreso_medio_comensal)}
                        </td>
                        <td className="px-4 py-3">
                          {fmtNum(row.tiempo_medio_ocupacion_minutos, ' min')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {mesasRm.map((row, idx) => (
                  <div key={row.mesa_id} className={`${SURFACE} p-4`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-lg font-bold">
                        Mesa #{row.mesa_numero}
                      </p>
                      {idx < 3 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                          <Trophy
                            size={14}
                            strokeWidth={1.5}
                            className="text-amber-500"
                          />
                          Top 3
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                      Zona: {row.zona || '—'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">
                          Visitas
                        </p>
                        <p className="font-bold">{row.total_visitas}</p>
                      </div>
                      <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">
                          Ingreso total
                        </p>
                        <p className="font-bold text-amber-500">
                          {fmtEuro(row.total_ingresos)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">
                          €/hora
                        </p>
                        <p className="font-bold">
                          {fmtEuro(row.ingreso_medio_hora)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">
                          €/comensal
                        </p>
                        <p className="font-bold">
                          {fmtEuro(row.ingreso_medio_comensal)}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-lg bg-[#f4f6f9] p-2 dark:bg-[#0f1117]">
                        <p className="text-[#6b7280] dark:text-[#8b90a7]">
                          Tiempo ocupación medio
                        </p>
                        <p className="font-bold">
                          {fmtNum(row.tiempo_medio_ocupacion_minutos, ' min')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
