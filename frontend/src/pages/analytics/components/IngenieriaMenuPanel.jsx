import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  BCG_META,
  BCG_ORDER,
  INPUT,
  SURFACE,
  badgeClasificacion,
  fmtEuro,
  fmtNum,
  labelClasificacion,
} from '../constants'

export default function IngenieriaMenuPanel({
  desdeIm,
  setDesdeIm,
  hastaIm,
  setHastaIm,
  cargarIngenieria,
  loadingIm,
  errorIm,
  dataIm,
  productosIm,
  resumenCls,
  productosPorClasificacion,
}) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:max-w-[180px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Desde
          </label>
          <input
            type="date"
            value={desdeIm}
            onChange={(e) => setDesdeIm(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="w-full min-w-0 sm:max-w-[180px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Hasta
          </label>
          <input
            type="date"
            value={hastaIm}
            onChange={(e) => setHastaIm(e.target.value)}
            className={INPUT}
          />
        </div>
        <button
          type="button"
          onClick={cargarIngenieria}
          className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
          disabled={loadingIm}
        >
          Actualizar
        </button>
      </div>

      {errorIm ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorIm}</p>
      ) : null}

      {loadingIm && !dataIm ? (
        <Loader />
      ) : (
        <>
          <p className="mb-2 text-xs text-[#6b7280] dark:text-[#8b90a7]">
            Eje horizontal: popularidad (unidades). Eje vertical: margen %.
            Medianas periodo: {fmtNum(dataIm?.mediana_unidades_vendidas, ' u.')} ·{' '}
            {fmtNum(dataIm?.mediana_margen_porcentaje, ' %')}
          </p>

          <div className="mb-6 hidden md:grid md:min-h-[320px] md:grid-cols-2 md:grid-rows-2 md:gap-2">
            {BCG_ORDER.map((key) => {
              const meta = BCG_META[key]
              const list = productosPorClasificacion[key] || []
              return (
                <div
                  key={key}
                  className={`flex flex-col rounded-xl border-2 p-3 ${meta.cellClass}`}
                >
                  <p
                    className={`text-center text-xs font-bold uppercase tracking-wide ${meta.titleClass}`}
                  >
                    {meta.label}
                  </p>
                  <p className="mb-2 text-center text-[10px] text-[#6b7280] dark:text-[#8b90a7]">
                    {meta.sub}
                  </p>
                  <div className="flex flex-1 flex-wrap content-start justify-center gap-1.5 overflow-y-auto">
                    {list.length === 0 ? (
                      <span className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                        —
                      </span>
                    ) : (
                      list.map((p) => (
                        <span
                          key={p.producto_id}
                          className="max-w-full truncate rounded-lg border border-[#e2e5ed] bg-white px-2 py-1 text-xs font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0]"
                          title={p.nombre}
                        >
                          {p.nombre}{' '}
                          <span className="text-amber-500">
                            {fmtNum(p.margen_porcentaje, '%')}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BCG_ORDER.map((k) => {
              const meta = BCG_META[k]
              const r = resumenCls[k] || { count: 0, ingreso_total: 0 }
              return (
                <div
                  key={k}
                  className={`${SURFACE} p-3 text-center`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${meta?.titleClass || 'text-[#6b7280] dark:text-[#8b90a7]'}`}
                  >
                    {meta?.label ?? k}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
                    {r.count ?? 0}
                  </p>
                  <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Ingreso
                  </p>
                  <p className="text-sm font-semibold text-amber-500">
                    {fmtEuro(r.ingreso_total)}
                  </p>
                </div>
              )
            })}
          </div>

          <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
            <table className="w-full min-w-[960px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Producto
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Ventas
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Ingreso
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Coste
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Margen
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    %
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Clasificación
                  </th>
                </tr>
              </thead>
              <tbody>
                {productosIm.map((p) => (
                  <tr
                    key={p.producto_id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3">
                      {fmtNum(p.unidades_vendidas, '')}
                    </td>
                    <td className="px-4 py-3">{fmtEuro(p.ingreso_total)}</td>
                    <td className="px-4 py-3">{fmtEuro(p.coste_total)}</td>
                    <td className="px-4 py-3">{fmtEuro(p.margen_total)}</td>
                    <td className="px-4 py-3">{fmtNum(p.margen_porcentaje, '%')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasificacion(p.clasificacion)}`}
                      >
                        {labelClasificacion(p.clasificacion)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {productosIm.map((p) => (
              <div key={p.producto_id} className={`${SURFACE} p-4`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-bold">{p.nombre}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClasificacion(p.clasificacion)}`}
                  >
                    {labelClasificacion(p.clasificacion)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[#6b7280] dark:text-[#8b90a7]">Ventas</p>
                    <p className="font-semibold">{fmtNum(p.unidades_vendidas, '')}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] dark:text-[#8b90a7]">Margen %</p>
                    <p className="font-semibold text-amber-500">
                      {fmtNum(p.margen_porcentaje, '%')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] dark:text-[#8b90a7]">Ingreso</p>
                    <p className="font-semibold">{fmtEuro(p.ingreso_total)}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] dark:text-[#8b90a7]">Coste</p>
                    <p className="font-semibold">{fmtEuro(p.coste_total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {productosIm.length === 0 && !loadingIm ? (
            <EmptyState message="Sin ventas en el periodo seleccionado" />
          ) : null}
        </>
      )}
    </>
  )
}
