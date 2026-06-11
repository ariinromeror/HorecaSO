import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSuperadminTenants } from '../../services/api'

const PAGE_SIZE = 20

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function TenantsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({ items: [], total: 0, page_size: PAGE_SIZE })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getSuperadminTenants(page, PAGE_SIZE)
      setData(res.data)
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.message ||
        'No se pudo cargar el listado'
      setError(typeof msg === 'string' ? msg : 'Error al cargar tenants')
      setData({ items: [], total: 0, page_size: PAGE_SIZE })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(
    1,
    Math.ceil((data.total || 0) / (data.page_size || PAGE_SIZE))
  )

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Building2
            className="text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <div>
            <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
              Tenants
            </h2>
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
              {data.total != null ? `${data.total} registros` : ''}
            </p>
          </div>
        </div>
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
          <table className="horeca-body-text w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e5ed] bg-[#f9fafb] dark:border-[#2e3347] dark:bg-[#14161f]">
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Nombre
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  NIF
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Plan
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Activo
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Alta
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    Cargando…
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    No hay tenants
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/superadmin/tenants/${row.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/superadmin/tenants/${row.id}`)
                      }
                    }}
                    className="cursor-pointer border-b border-[#e2e5ed] transition-colors last:border-0 hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:hover:bg-[#222536]"
                  >
                    <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                      {row.nombre}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {row.nif || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {row.plan || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.activo
                            ? 'inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                            : 'inline-flex rounded-full bg-[#e5e7eb] px-2.5 py-0.5 text-xs font-medium text-[#6b7280] dark:bg-[#2e3347] dark:text-[#8b90a7]'
                        }
                      >
                        {row.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {formatDate(row.created_at)}
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
              Página {page} de {totalPages}
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
