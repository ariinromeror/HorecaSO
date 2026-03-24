import Loader from '../../../components/shared/Loader'
import { SURFACE_APPCC } from '../appccConstants'

export default function ResumenDiarioPanel({
  errorResumen,
  loadingResumen,
  resumen,
}) {
  const pct = resumen != null ? Number(resumen.porcentaje_conformidad) : null
  const pctOk = pct != null && !Number.isNaN(pct) && pct >= 90

  return (
    <section className="mb-6">
      {errorResumen ? (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">
          {errorResumen}
        </p>
      ) : null}
      {loadingResumen && !resumen ? (
        <Loader />
      ) : resumen ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          <div className={`${SURFACE_APPCC} p-3`}>
            <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
              Total registros hoy
            </p>
            <p className="mt-1 text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
              {resumen.total_registros ?? 0}
            </p>
          </div>
          <div className={`${SURFACE_APPCC} p-3`}>
            <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
              Conformes
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {resumen.conformes ?? 0}
            </p>
          </div>
          <div className={`${SURFACE_APPCC} p-3`}>
            <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
              No conformes
            </p>
            <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
              {resumen.no_conformes ?? 0}
            </p>
          </div>
          <div className={`${SURFACE_APPCC} p-3`}>
            <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
              % Conformidad
            </p>
            <p
              className={`mt-1 text-xl font-bold ${
                pctOk
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {pct != null && !Number.isNaN(pct)
                ? `${pct.toFixed(2)} %`
                : '—'}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
