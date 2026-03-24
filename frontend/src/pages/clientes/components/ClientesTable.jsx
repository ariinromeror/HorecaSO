import { Eye, Pencil, Star } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT,
  SURFACE,
  formatEuroFromApi,
  formatFechaHumana,
} from '../constants'

export default function ClientesTable({
  buscarInput,
  setBuscarInput,
  puntosMin,
  setPuntosMin,
  error,
  loading,
  clientes,
  abrirHistorial,
  abrirEditar,
  abrirPuntos,
}) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:max-w-md sm:flex-1">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Buscar (nombre, email, teléfono)
          </label>
          <input
            type="search"
            value={buscarInput}
            onChange={(e) => setBuscarInput(e.target.value)}
            placeholder="Buscar…"
            className={INPUT}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Puntos mín.
          </label>
          <input
            type="number"
            min={0}
            value={puntosMin}
            onChange={(e) => setPuntosMin(e.target.value)}
            placeholder="—"
            className={INPUT}
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading ? (
        <Loader />
      ) : clientes.length === 0 ? (
        <EmptyState message="No hay clientes con estos filtros" />
      ) : (
        <>
          <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
            <table className="w-full min-w-[960px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Visitas
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Gasto total
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Puntos
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Última visita
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3 font-medium">{c.nombre}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {c.email || '—'}
                    </td>
                    <td className="px-4 py-3">{c.telefono || '—'}</td>
                    <td className="px-4 py-3">{c.total_visitas ?? 0}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatEuroFromApi(c.gasto_total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        <Star
                          size={14}
                          className="text-amber-500"
                          strokeWidth={1.5}
                        />
                        {c.puntos_fidelidad ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatFechaHumana(c.ultima_visita)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirHistorial(c)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-[#111827] dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]"
                          title="Ver historial"
                        >
                          <Eye size={18} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEditar(c)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-amber-500 dark:border-[#2e3347] dark:bg-[#0f1117]"
                          title="Editar"
                        >
                          <Pencil size={18} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirPuntos(c)}
                          className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] text-amber-500 dark:border-[#2e3347] dark:bg-[#0f1117]"
                          title="Puntos"
                        >
                          <Star size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {clientes.map((c) => (
              <div key={c.id} className={`${SURFACE} p-4`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                    {c.nombre}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Star size={14} className="text-amber-500" strokeWidth={1.5} />
                    {c.puntos_fidelidad ?? 0} pts
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {c.email || '—'} · {c.telefono || '—'}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Visitas:{' '}
                  </span>
                  {c.total_visitas ?? 0}
                  <span className="mx-2 text-[#e2e5ed] dark:text-[#2e3347]">|</span>
                  <span className="text-[#6b7280] dark:text-[#8b90a7]">
                    Gasto:{' '}
                  </span>
                  {formatEuroFromApi(c.gasto_total)}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => abrirHistorial(c)}
                    className={`${BTN_SECONDARY} w-full border-[#e2e5ed] dark:border-[#2e3347]`}
                  >
                    <Eye className="mr-2 shrink-0" size={18} strokeWidth={1.5} />
                    Ver historial
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirEditar(c)}
                    className={`${BTN_PRIMARY} w-full`}
                  >
                    <Pencil className="mr-2 shrink-0" size={18} strokeWidth={1.5} />
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
