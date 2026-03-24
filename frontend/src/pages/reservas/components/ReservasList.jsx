import { CheckCircle, Pencil } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  ESTADOS_RESERVA,
  INPUT,
  SELECT,
  SURFACE,
  badgeReservaClass,
  formatFechaCorta,
  formatHoraDisplay,
} from '../constants'

export default function ReservasList({
  filtroFecha,
  setFiltroFecha,
  filtroEstado,
  setFiltroEstado,
  errorReservas,
  loadingReservas,
  reservas,
  abrirModalEstado,
  abrirEditarReserva,
  confirmarRapido,
}) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Fecha
          </label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="w-full min-w-0 sm:max-w-[240px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className={SELECT}
          >
            {ESTADOS_RESERVA.map((o) => (
              <option key={o.value || 'todos'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorReservas ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorReservas}</p>
      ) : null}

      {loadingReservas ? (
        <Loader />
      ) : reservas.length === 0 ? (
        <EmptyState message="No hay reservas para esta fecha y filtros" />
      ) : (
        <>
          <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
            <table className="w-full min-w-[800px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Fecha
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Hora
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Personas
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Mesa
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3 font-medium">{r.nombre_cliente}</td>
                    <td className="px-4 py-3">{r.telefono}</td>
                    <td className="px-4 py-3">{formatFechaCorta(r.fecha)}</td>
                    <td className="px-4 py-3">{formatHoraDisplay(r.hora)}</td>
                    <td className="px-4 py-3">{r.num_personas}</td>
                    <td className="px-4 py-3">
                      {r.mesa_numero != null ? `#${r.mesa_numero}` : '—'}
                      {r.zona ? (
                        <span className="ml-1 text-[#6b7280] dark:text-[#8b90a7]">
                          ({r.zona})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeReservaClass(r.estado)}`}
                      >
                        {r.estado || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalEstado(r)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-emerald-600 dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-emerald-400"
                          title="Cambiar estado"
                        >
                          <CheckCircle size={20} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEditarReserva(r)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-amber-500 dark:border-[#2e3347] dark:bg-[#0f1117]"
                          title="Editar"
                        >
                          <Pencil size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {reservas.map((r) => (
              <div
                key={r.id}
                className={`${SURFACE} p-4 shadow-sm`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                    {r.nombre_cliente}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeReservaClass(r.estado)}`}
                  >
                    {r.estado}
                  </span>
                </div>
                <p className="mb-2 text-[#6b7280] dark:text-[#8b90a7]">
                  {formatFechaCorta(r.fecha)} · {formatHoraDisplay(r.hora)} ·{' '}
                  {r.num_personas} pers.
                </p>
                <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Mesa:{' '}
                  {r.mesa_numero != null ? `#${r.mesa_numero}` : '—'}
                  {r.zona ? ` · ${r.zona}` : ''}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => confirmarRapido(r)}
                    className={`${BTN_PRIMARY} w-full bg-blue-600 text-white hover:bg-blue-700`}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirEditarReserva(r)}
                    className={`${BTN_SECONDARY} w-full border-amber-500/40 text-amber-500`}
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
