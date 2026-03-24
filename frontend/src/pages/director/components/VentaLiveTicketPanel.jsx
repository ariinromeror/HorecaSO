import { X } from 'lucide-react'
import Loader from '../../../components/shared/Loader'
import {
  EstadoBadge,
  fechaHoraDesdeIso,
  formatEuro,
  metodoEtiqueta,
  ticketIdCorto,
} from './ventaLiveFormat'

export default function VentaLiveTicketPanel({
  panelAbierto,
  cerrarPanel,
  panelAnimIn,
  ticketDetalle,
  panelTicketId,
  loadingDetalle,
  detalleError,
  lineasSubtotalSum,
  mostrarPagosRegistrados,
}) {
  if (!panelAbierto) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label="Cerrar panel"
        onClick={cerrarPanel}
      />
      <aside
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-[#e2e5ed] bg-white shadow-xl transition-transform duration-200 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:w-80 md:w-96',
          panelAnimIn ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="venta-live-panel-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <div className="min-w-0">
            <h2
              id="venta-live-panel-title"
              className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
            >
              Ticket #
              {ticketDetalle
                ? ticketIdCorto(ticketDetalle.id)
                : panelTicketId
                  ? ticketIdCorto(panelTicketId)
                  : '…'}
            </h2>
            {ticketDetalle ? (
              <div className="mt-2">
                <EstadoBadge estado={ticketDetalle.estado} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={cerrarPanel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loadingDetalle ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : detalleError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {detalleError}
            </p>
          ) : ticketDetalle ? (
            <>
              <section className="mb-6 space-y-2 text-sm text-[#111827] dark:text-[#e8eaf0]">
                <p>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Mesa:{' '}
                  </span>
                  {ticketDetalle.mesa_numero != null &&
                  ticketDetalle.mesa_numero !== ''
                    ? String(ticketDetalle.mesa_numero)
                    : 'Sin mesa'}
                </p>
                <p>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Camarero:{' '}
                  </span>
                  {ticketDetalle.camarero_nombre || '—'}
                </p>
                <p>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Hora apertura:{' '}
                  </span>
                  {fechaHoraDesdeIso(ticketDetalle.created_at)}
                </p>
                <p>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Hora cobro:{' '}
                  </span>
                  {ticketDetalle.cobrado_at
                    ? fechaHoraDesdeIso(ticketDetalle.cobrado_at)
                    : '—'}
                </p>
                <p>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Tiempo ocupación:{' '}
                  </span>
                  {ticketDetalle.tiempo_ocupacion != null
                    ? `${ticketDetalle.tiempo_ocupacion} minutos`
                    : '—'}
                </p>
                <p>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Comensales:{' '}
                  </span>
                  {ticketDetalle.num_comensales ?? '—'}
                </p>
              </section>

              <section className="mb-6">
                <table className="w-full text-left text-xs text-[#111827] dark:text-[#e8eaf0]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="py-1.5 pr-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Producto
                      </th>
                      <th className="py-1.5 pr-2 text-right font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Cant.
                      </th>
                      <th className="py-1.5 pr-2 text-right font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        P. Unit
                      </th>
                      <th className="py-1.5 text-right font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ticketDetalle.lineas || []).map((ln) => (
                      <tr
                        key={ln.id}
                        className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                      >
                        <td className="max-w-[10rem] truncate py-1.5 pr-2">
                          {ln.producto_nombre || '—'}
                        </td>
                        <td className="py-1.5 pr-2 text-right">
                          {ln.cantidad}
                        </td>
                        <td className="py-1.5 pr-2 text-right">
                          {formatEuro(ln.precio_unitario)}
                        </td>
                        <td className="py-1.5 text-right">
                          {formatEuro(ln.subtotal)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td
                        colSpan={3}
                        className="py-2 pr-2 text-right text-[#6b7280] dark:text-[#8b90a7]"
                      >
                        Total líneas
                      </td>
                      <td className="py-2 text-right">
                        {formatEuro(lineasSubtotalSum)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {mostrarPagosRegistrados ? (
                <section className="mb-6">
                  <h3 className="mb-2 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Pagos registrados
                  </h3>
                  <ul className="space-y-1.5 text-sm text-[#111827] dark:text-[#e8eaf0]">
                    {ticketDetalle.pagos.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between gap-2 border-b border-[#e2e5ed] py-1 dark:border-[#2e3347]"
                      >
                        <span>{metodoEtiqueta(p.metodo_pago)}</span>
                        <span className="font-medium">
                          {formatEuro(p.importe)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p className="text-xl font-bold text-amber-500">
                Total: {formatEuro(ticketDetalle.total)}
              </p>
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
