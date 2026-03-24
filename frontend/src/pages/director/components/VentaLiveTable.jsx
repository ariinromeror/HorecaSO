import { ChevronRight } from 'lucide-react'
import VentaLiveTicketPanel from './VentaLiveTicketPanel'
import {
  EstadoBadge,
  MetodoBadgeTabla,
  formatEuro,
  horaDesdeIso,
} from './ventaLiveFormat'

export default function VentaLiveTable({
  ticketsDia,
  abrirDetalleTicket,
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
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#e2e5ed] bg-white shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-3">
        <div className="border-b border-[#e2e5ed] p-6 dark:border-[#2e3347]">
          <h2 className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Tickets del día
          </h2>
          <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Todos los tickets del local creados hoy (actualización cada 30 s)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Hora
                </th>
                <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Mesa
                </th>
                <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Camarero
                </th>
                <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Estado
                </th>
                <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Productos
                </th>
                <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Total
                </th>
                <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Método
                </th>
                <th
                  className="w-10 px-2 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                  aria-label="Abrir detalle"
                />
              </tr>
            </thead>
            <tbody>
              {ticketsDia.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    No hay tickets para mostrar
                  </td>
                </tr>
              ) : (
                ticketsDia.map((t) => {
                  const est = String(t.estado || '').toLowerCase()
                  const totalClass =
                    est === 'cobrado'
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : est === 'abierto'
                        ? 'font-semibold text-amber-500'
                        : 'font-medium text-[#111827] dark:text-[#e8eaf0]'
                  const numLineas = Number(t.num_lineas) || 0
                  return (
                    <tr
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => abrirDetalleTicket(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          abrirDetalleTicket(t.id)
                        }
                      }}
                      className="cursor-pointer border-b border-[#e2e5ed] transition-colors hover:bg-[#f0f2f5] dark:border-[#2e3347] dark:hover:bg-[#222536]"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {horaDesdeIso(t.created_at)}
                      </td>
                      <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {t.mesa_numero != null && t.mesa_numero !== ''
                          ? String(t.mesa_numero)
                          : 'Sin mesa'}
                      </td>
                      <td className="max-w-[8rem] truncate px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {t.camarero_nombre || '—'}
                      </td>
                      <td className="px-4 py-2">
                        <EstadoBadge estado={t.estado} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {numLineas} productos
                      </td>
                      <td className={`whitespace-nowrap px-4 py-2 ${totalClass}`}>
                        {formatEuro(t.total)}
                      </td>
                      <td className="px-4 py-2">
                        <MetodoBadgeTabla metodoPago={t.metodo_pago} />
                      </td>
                      <td className="px-2 py-2 text-[#9ca3af]">
                        <ChevronRight
                          size={18}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VentaLiveTicketPanel
        panelAbierto={panelAbierto}
        cerrarPanel={cerrarPanel}
        panelAnimIn={panelAnimIn}
        ticketDetalle={ticketDetalle}
        panelTicketId={panelTicketId}
        loadingDetalle={loadingDetalle}
        detalleError={detalleError}
        lineasSubtotalSum={lineasSubtotalSum}
        mostrarPagosRegistrados={mostrarPagosRegistrados}
      />
    </>
  )
}
