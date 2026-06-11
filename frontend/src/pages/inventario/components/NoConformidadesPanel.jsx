import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  formatFechaHora,
  INPUT_APPCC,
  labelTipo,
  SURFACE_APPCC,
} from '../appccConstants'
import AppCCFilaRegistro from './AppCCFilaRegistro'

export default function NoConformidadesPanel({
  puedeVerNoConformesDetalle,
  ncDesde,
  setNcDesde,
  ncHasta,
  setNcHasta,
  cargarNoConformes,
  loadingNc,
  errorNc,
  noConformes,
}) {
  if (!puedeVerNoConformesDetalle) {
    return (
      <EmptyState message="El detalle de no conformidades solo está disponible para administración." />
    )
  }

  return (
    <>
      <div className="mb-4 flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:max-w-[160px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Desde
          </label>
          <input
            type="date"
            value={ncDesde}
            onChange={(e) => setNcDesde(e.target.value)}
            className={INPUT_APPCC}
          />
        </div>
        <div className="w-full min-w-0 sm:max-w-[160px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Hasta
          </label>
          <input
            type="date"
            value={ncHasta}
            onChange={(e) => setNcHasta(e.target.value)}
            className={INPUT_APPCC}
          />
        </div>
        <button
          type="button"
          onClick={cargarNoConformes}
          disabled={loadingNc}
          className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
        >
          Actualizar
        </button>
      </div>

      {errorNc ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorNc}</p>
      ) : null}

      {loadingNc && noConformes.length === 0 ? (
        <Loader />
      ) : noConformes.length === 0 ? (
        <EmptyState message="No hay no conformidades en el periodo" />
      ) : (
        <>
          <div className={`hidden md:block ${SURFACE_APPCC} overflow-x-auto`}>
            <table className="horeca-body-text w-full min-w-[1000px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Fecha/Hora
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Tipo
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Equipo
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Temperatura
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Conforme
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Observaciones
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Usuario
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acción correctora
                  </th>
                </tr>
              </thead>
              <tbody>
                {noConformes.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <AppCCFilaRegistro
                      row={row}
                      extraCorrectora
                      forceNoBadge
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {noConformes.map((row) => (
              <div key={row.id} className={`${SURFACE_APPCC} p-4`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold capitalize">
                    {labelTipo(row.tipo_control)}
                  </span>
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                    No conforme
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {formatFechaHora(row.created_at)}
                </p>
                <p className="mt-1 text-sm">
                  Equipo: {row.nombre_equipo || '—'}
                  {row.temperatura != null && row.temperatura !== ''
                    ? ` · ${Number(row.temperatura).toFixed(1)} °C`
                    : ''}
                </p>
                {row.observaciones ? (
                  <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    {row.observaciones}
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                  Acción: {row.accion_correctora || '—'}
                </p>
                <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  {row.nombre_usuario}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
