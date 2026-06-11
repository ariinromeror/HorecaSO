import { Eye } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  badgeEstadoPago,
  diasHastaVencimiento,
  fechaCortaFactura,
  formatEuro,
  INPUT_FACTURAS,
  textoVencimiento,
} from '../constants'

export default function FacturasList({
  tabActiva,
  setTabActiva,
  filtros,
  setFiltros,
  syncProveedorUrl,
  proveedores,
  error,
  loading,
  listaMostrada,
  puedeEscribir,
  marcarPagada,
  abrirLineas,
}) {
  return (
    <>
      <div className="mb-4 flex gap-2 border-b border-[#e2e5ed] dark:border-[#2e3347]">
        <button
          type="button"
          onClick={() => setTabActiva('todas')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tabActiva === 'todas'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setTabActiva('pendientes')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tabActiva === 'pendientes'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Pendientes de pago
        </button>
      </div>

      {tabActiva === 'todas' ? (
        <div className="mb-4 grid min-w-0 max-w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Proveedor
            <select
              value={filtros.proveedor_id}
              onChange={(e) => {
                const v = e.target.value
                setFiltros((f) => ({ ...f, proveedor_id: v }))
                syncProveedorUrl(v)
              }}
              className={`${INPUT_FACTURAS} mt-1`}
            >
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Estado pago
            <select
              value={filtros.pagada}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, pagada: e.target.value }))
              }
              className={`${INPUT_FACTURAS} mt-1`}
            >
              <option value="">Todas</option>
              <option value="false">Pendientes</option>
              <option value="true">Pagadas</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Desde
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, desde: e.target.value }))
              }
              className={`${INPUT_FACTURAS} mt-1`}
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Hasta
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, hasta: e.target.value }))
              }
              className={`${INPUT_FACTURAS} mt-1`}
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading ? (
        <Loader />
      ) : listaMostrada.length === 0 ? (
        <EmptyState message="No hay facturas" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[#e2e5ed] bg-white shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:block">
            <table className="horeca-body-text w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Fecha
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Nº Factura
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Proveedor
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Total
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Vencimiento
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Estado
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {listaMostrada.map((f) => {
                  const dias =
                    tabActiva === 'pendientes' && f.dias_vencimiento != null
                      ? f.dias_vencimiento
                      : diasHastaVencimiento(f.fecha_vencimiento)
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                    >
                      <td className="px-3 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {fechaCortaFactura(f.fecha)}
                      </td>
                      <td className="px-3 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {f.numero_factura || '—'}
                      </td>
                      <td className="px-3 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {f.proveedor_nombre || '—'}
                      </td>
                      <td className="px-3 py-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {formatEuro(f.total)}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {textoVencimiento(f, dias)}
                      </td>
                      <td className="px-3 py-2">{badgeEstadoPago(f, dias)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {puedeEscribir && !f.pagada ? (
                            <button
                              type="button"
                              onClick={() => marcarPagada(f.id)}
                              className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                            >
                              Marcar pagada
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => abrirLineas(f)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#e2e5ed] px-2 py-1 text-xs dark:border-[#2e3347]"
                          >
                            <Eye size={14} strokeWidth={1.5} />
                            Ver líneas
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {listaMostrada.map((f) => {
              const dias =
                tabActiva === 'pendientes' && f.dias_vencimiento != null
                  ? f.dias_vencimiento
                  : diasHastaVencimiento(f.fecha_vencimiento)
              return (
                <div
                  key={f.id}
                  className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {f.proveedor_nombre}
                    </span>
                    {badgeEstadoPago(f, dias)}
                  </div>
                  <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    {fechaCortaFactura(f.fecha)} · {f.numero_factura || 'S/N'}
                  </p>
                  <p className="mt-2 text-lg font-bold text-amber-500">
                    {formatEuro(f.total)}
                  </p>
                  <p className="mt-1 text-sm">{textoVencimiento(f, dias)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {puedeEscribir && !f.pagada ? (
                      <button
                        type="button"
                        onClick={() => marcarPagada(f.id)}
                        className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-400"
                      >
                        Marcar pagada
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => abrirLineas(f)}
                      className="rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm dark:border-[#2e3347]"
                    >
                      Ver líneas
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
