import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  formatFechaHora,
  INPUT_APPCC,
  labelTipo,
  SELECT_APPCC,
  SURFACE_APPCC,
  TIPOS_CONTROL,
} from '../appccConstants'
import AppCCFilaRegistro from './AppCCFilaRegistro'

export default function RegistrosAPPCCTable({
  filtroTipo,
  setFiltroTipo,
  filtroDesde,
  setFiltroDesde,
  filtroHasta,
  setFiltroHasta,
  filtroConforme,
  setFiltroConforme,
  cargarRegistros,
  loadingReg,
  errorReg,
  registros,
}) {
  return (
    <>
      <div className="mb-4 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="w-full min-w-0 lg:max-w-[200px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Tipo
          </label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className={SELECT_APPCC}
          >
            {TIPOS_CONTROL.map((t) => (
              <option key={t.value || 'all'} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full min-w-0 sm:max-w-[160px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Desde
          </label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className={INPUT_APPCC}
          />
        </div>
        <div className="w-full min-w-0 sm:max-w-[160px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Hasta
          </label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className={INPUT_APPCC}
          />
        </div>
        <div className="w-full min-w-0 lg:max-w-[160px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Conforme
          </label>
          <select
            value={filtroConforme}
            onChange={(e) => setFiltroConforme(e.target.value)}
            className={SELECT_APPCC}
          >
            <option value="">Todos</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
        <button
          type="button"
          onClick={cargarRegistros}
          disabled={loadingReg}
          className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
        >
          Actualizar
        </button>
      </div>

      {errorReg ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorReg}</p>
      ) : null}

      {loadingReg && registros.length === 0 ? (
        <Loader />
      ) : registros.length === 0 ? (
        <EmptyState message="No hay registros para los filtros" />
      ) : (
        <>
          <div className={`hidden md:block ${SURFACE_APPCC} overflow-x-auto`}>
            <table className="w-full min-w-[900px] text-left text-[15px]">
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
                </tr>
              </thead>
              <tbody>
                {registros.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <AppCCFilaRegistro row={row} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {registros.map((row) => (
              <div key={row.id} className={`${SURFACE_APPCC} p-4`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold capitalize">
                    {labelTipo(row.tipo_control)}
                  </span>
                  {row.conforme ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Conforme
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                      No conforme
                    </span>
                  )}
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
