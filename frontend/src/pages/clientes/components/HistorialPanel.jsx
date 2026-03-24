import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  BTN_SECONDARY,
  SURFACE,
  formatEuroFromApi,
  formatFechaHumana,
  formatFechaTicket,
} from '../constants'

export default function HistorialPanel({
  modalHistorial,
  historialLoading,
  historialError,
  historialData,
  cerrarHistorial,
}) {
  if (!modalHistorial) return null

  const clienteHistorial = historialData?.cliente
  const ticketsHistorial = Array.isArray(historialData?.tickets)
    ? historialData.tickets
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`${SURFACE} max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
      >
        <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          Historial — {modalHistorial.nombre}
        </h2>
        {historialLoading ? (
          <Loader />
        ) : historialError ? (
          <p className="text-red-600 dark:text-red-400">{historialError}</p>
        ) : (
          <>
            {clienteHistorial ? (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                  <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Visitas
                  </p>
                  <p className="text-lg font-bold">
                    {clienteHistorial.total_visitas ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                  <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Gasto total
                  </p>
                  <p className="text-lg font-bold">
                    {formatEuroFromApi(clienteHistorial.gasto_total)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                  <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Gasto medio
                  </p>
                  <p className="text-lg font-bold">
                    {formatEuroFromApi(clienteHistorial.gasto_medio)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                  <p className="text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Última visita
                  </p>
                  <p className="text-sm font-bold leading-tight">
                    {formatFechaHumana(clienteHistorial.ultima_visita)}
                  </p>
                </div>
              </div>
            ) : null}

            {ticketsHistorial.length === 0 ? (
              <EmptyState message="Sin tickets en el historial reciente" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="py-2 pr-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Fecha
                      </th>
                      <th className="py-2 pr-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Total
                      </th>
                      <th className="py-2 pr-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Método pago
                      </th>
                      <th className="py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Comensales
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketsHistorial.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="py-2 pr-3">
                          {formatFechaTicket(t.cobrado_at || t.created_at)}
                        </td>
                        <td className="py-2 pr-3 font-medium">
                          {formatEuroFromApi(t.total)}
                        </td>
                        <td className="py-2 pr-3">
                          {t.metodo_pago || '—'}
                        </td>
                        <td className="py-2">
                          {t.num_comensales ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <button
          type="button"
          onClick={cerrarHistorial}
          className={`${BTN_SECONDARY} mt-6 w-full sm:w-auto`}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
