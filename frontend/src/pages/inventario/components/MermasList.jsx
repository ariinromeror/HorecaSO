import { Filter } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  badgeMotivoClass,
  BTN_PRIMARY_MERMAS,
  costeLinea,
  formatEuro2,
  formatFechaHora,
  INPUT_MERMAS,
  labelMotivo,
  parseMotivoCategoria,
  TABLE_WRAP_MERMAS,
  ICON_MERMAS,
} from '../mermasConstants'

export default function MermasList({
  filtros,
  setFiltros,
  aplicarFiltros,
  loadingArticulos,
  articulos,
  loadingMovimientos,
  movimientos,
}) {
  return (
    <>
      <div
        className={`flex min-w-0 max-w-full flex-col gap-3 overflow-x-auto p-4 sm:flex-row sm:flex-wrap sm:items-end ${TABLE_WRAP_MERMAS}`}
      >
        <div className="min-w-0 flex-1 sm:min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
            Desde
          </label>
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, desde: e.target.value }))
            }
            className={INPUT_MERMAS}
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
            Hasta
          </label>
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, hasta: e.target.value }))
            }
            className={INPUT_MERMAS}
          />
        </div>
        <div className="min-w-0 flex-[2] sm:min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
            Artículo
          </label>
          <select
            value={filtros.articulo_id}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, articulo_id: e.target.value }))
            }
            className={INPUT_MERMAS}
            disabled={loadingArticulos}
          >
            <option value="">Todos</option>
            {articulos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={aplicarFiltros}
          className={`${BTN_PRIMARY_MERMAS} w-full sm:w-auto`}
        >
          <Filter {...ICON_MERMAS} className="h-5 w-5" />
          Filtrar
        </button>
      </div>

      {loadingMovimientos ? (
        <Loader />
      ) : movimientos.length === 0 ? (
        <EmptyState message="No hay mermas en el periodo seleccionado." />
      ) : (
        <>
          <div className={`hidden md:block ${TABLE_WRAP_MERMAS}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-[#e2e5ed] bg-[#f9fafb] dark:border-[#2e3347] dark:bg-[#222536]">
                  <tr className="text-[#6b7280] dark:text-[#9ca3af]">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Artículo</th>
                    <th className="px-4 py-3 font-medium">Cantidad</th>
                    <th className="px-4 py-3 font-medium">Motivo</th>
                    <th className="px-4 py-3 font-medium">Coste unitario</th>
                    <th className="px-4 py-3 font-medium">Coste total</th>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => {
                    const cat = parseMotivoCategoria(m.motivo)
                    const motivoDetalle =
                      m.motivo && m.motivo.includes(':')
                        ? m.motivo.split(':').slice(1).join(':').trim()
                        : ''
                    const cu = m.coste_unitario
                    const ct = costeLinea(m.cantidad, cu)
                    const unidad =
                      articulos.find((x) => x.id === m.articulo_id)
                        ?.unidad_medida || ''
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                          {formatFechaHora(m.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                          {m.articulo_nombre}
                        </td>
                        <td className="px-4 py-3 font-medium text-red-500">
                          -
                          {new Intl.NumberFormat('es-ES', {
                            maximumFractionDigits: 4,
                          }).format(Number(m.cantidad))}{' '}
                          {unidad}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${badgeMotivoClass(
                              cat
                            )}`}
                          >
                            {labelMotivo(cat)}
                          </span>
                          {motivoDetalle ? (
                            <p className="mt-1 max-w-[220px] text-xs text-[#6b7280] dark:text-[#9ca3af]">
                              {motivoDetalle}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {cu != null ? formatEuro2(cu) : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-red-500">
                          {ct != null ? formatEuro2(ct) : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                          {m.usuario_nombre || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {movimientos.map((m) => {
              const cat = parseMotivoCategoria(m.motivo)
              const cu = m.coste_unitario
              const ct = costeLinea(m.cantidad, cu)
              const unidad =
                articulos.find((x) => x.id === m.articulo_id)
                  ?.unidad_medida || ''
              const detalleExtra =
                m.motivo && m.motivo.includes(':')
                  ? m.motivo.split(':').slice(1).join(':').trim()
                  : ''
              return (
                <div key={m.id} className={`p-4 ${TABLE_WRAP_MERMAS}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        {m.articulo_nombre}
                      </p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                        {formatFechaHora(m.created_at)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${badgeMotivoClass(
                        cat
                      )}`}
                    >
                      {labelMotivo(cat)}
                    </span>
                  </div>
                  {detalleExtra ? (
                    <p className="mt-2 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                      {detalleExtra}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium text-red-500">
                    -
                    {new Intl.NumberFormat('es-ES', {
                      maximumFractionDigits: 4,
                    }).format(Number(m.cantidad))}{' '}
                    {unidad}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                        Coste u.
                      </dt>
                      <dd>{cu != null ? formatEuro2(cu) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                        Coste total
                      </dt>
                      <dd className="font-medium text-red-500">
                        {ct != null ? formatEuro2(ct) : '—'}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                        Usuario
                      </dt>
                      <dd>{m.usuario_nombre || '—'}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
