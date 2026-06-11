import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ScrollText,
} from 'lucide-react'
import { getSuperadminPlatformLogs } from '../../services/api'

const PAGE_SIZE = 20

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'medium',
    })
  } catch {
    return iso
  }
}

function formatDetalle(detalle) {
  if (detalle == null) return '—'
  try {
    const s =
      typeof detalle === 'string' ? detalle : JSON.stringify(detalle)
    return s.length > 120 ? `${s.slice(0, 117)}…` : s
  } catch {
    return String(detalle)
  }
}

export default function PlatformLogsPage() {
  const [page, setPage] = useState(1)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [appliedDesde, setAppliedDesde] = useState('')
  const [appliedHasta, setAppliedHasta] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    items: [],
    total: 0,
    page_size: PAGE_SIZE,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = {
      page,
      page_size: PAGE_SIZE,
    }
    if (appliedDesde) params.fecha_desde = appliedDesde
    if (appliedHasta) params.fecha_hasta = appliedHasta
    try {
      const res = await getSuperadminPlatformLogs(params)
      setData(res.data)
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.message ||
        'No se pudieron cargar los logs'
      setError(typeof msg === 'string' ? msg : 'Error al cargar')
      setData({ items: [], total: 0, page_size: PAGE_SIZE })
    } finally {
      setLoading(false)
    }
  }, [page, appliedDesde, appliedHasta])

  useEffect(() => {
    load()
  }, [load])

  const applyFilters = () => {
    setPage(1)
    setAppliedDesde(fechaDesde)
    setAppliedHasta(fechaHasta)
  }

  const totalPages = Math.max(
    1,
    Math.ceil((data.total || 0) / (data.page_size || PAGE_SIZE))
  )

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ScrollText
            className="text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <div>
            <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              Logs de plataforma
            </h2>
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Auditoría superadmin
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <label
            htmlFor="log-desde"
            className="text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
          >
            Desde
          </label>
          <input
            id="log-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-[#e2e5ed] bg-[#f9fafb] px-3 py-2 text-sm text-[#111827] dark:border-[#2e3347] dark:bg-[#14161f] dark:text-[#e8eaf0]"
          />
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <label
            htmlFor="log-hasta"
            className="text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
          >
            Hasta
          </label>
          <input
            id="log-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-[#e2e5ed] bg-[#f9fafb] px-3 py-2 text-sm text-[#111827] dark:border-[#2e3347] dark:bg-[#14161f] dark:text-[#e8eaf0]"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-amber-400"
        >
          <Filter size={18} strokeWidth={1.5} />
          Aplicar filtros
        </button>
      </div>

      {error ? (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <AlertTriangle size={18} strokeWidth={1.5} />
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="overflow-x-auto">
          <table className="horeca-body-text w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e5ed] bg-[#f9fafb] dark:border-[#2e3347] dark:bg-[#14161f]">
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Fecha
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Actor
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Acción
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    Cargando…
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    No hay registros
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#e2e5ed] last:border-0 dark:border-[#2e3347]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-[#111827] dark:text-[#e8eaf0]">
                      {row.usuario_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {row.accion || row.modulo || '—'}
                    </td>
                    <td
                      className="max-w-[280px] truncate px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]"
                      title={formatDetalle(row.detalle)}
                    >
                      {formatDetalle(row.detalle)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && data.items.length > 0 ? (
          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347] sm:flex-row sm:items-center">
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Página {page} de {totalPages} · {data.total} registros
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm font-medium text-[#374151] transition-colors enabled:hover:bg-[#f4f6f9] disabled:opacity-40 dark:border-[#2e3347] dark:text-[#c4c9d4] dark:enabled:hover:bg-[#222536]"
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm font-medium text-[#374151] transition-colors enabled:hover:bg-[#f4f6f9] disabled:opacity-40 dark:border-[#2e3347] dark:text-[#c4c9d4] dark:enabled:hover:bg-[#222536]"
              >
                Siguiente
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
