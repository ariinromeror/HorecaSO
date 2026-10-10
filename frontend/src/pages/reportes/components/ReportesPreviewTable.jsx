import { Loader2 } from 'lucide-react'

const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'

/**
 * Vista previa compartida: cards en móvil, tabla en md+.
 * @param {{ key: string, label: string, align?: 'left'|'right', format?: (v, row) => string }[]} columns
 * @param {Record<string, unknown>[]} rows
 */
export default function ReportesPreviewTable({
  columns,
  rows,
  loading,
  emptyMessage = 'Sin datos para los filtros seleccionados.',
  summary,
  title,
}) {
  if (loading) {
    return (
      <div
        className={`${SURFACE} flex items-center justify-center gap-2 p-8 text-[15px] text-[#6b7280] dark:text-[#8b90a7]`}
      >
        <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
        Cargando…
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div
        className={`${SURFACE} p-6 text-[15px] text-[#6b7280] dark:text-[#8b90a7]`}
      >
        {emptyMessage}
      </div>
    )
  }

  const cell = (col, row) => {
    const raw = row[col.key]
    if (col.format) return col.format(raw, row)
    if (raw == null || raw === '') return '—'
    return String(raw)
  }

  return (
    <div className={`${SURFACE} overflow-hidden`}>
      {title ? (
        <div className="border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]">
          <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
            {title}
          </h3>
        </div>
      ) : null}

      {summary ? (
        <div className="border-b border-[#e2e5ed] bg-[#f4f6f9] px-4 py-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]">
          {summary}
        </div>
      ) : null}

      {/* Móvil: cards */}
      <ul className="divide-y divide-[#e2e5ed] md:hidden dark:divide-[#2e3347]">
        {rows.map((row, i) => (
          <li key={row.id || row._key || i} className="space-y-1.5 p-4">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-start justify-between gap-3 text-[15px]"
              >
                <span className="shrink-0 text-[#6b7280] dark:text-[#8b90a7]">
                  {col.label}
                </span>
                <span
                  className={`min-w-0 text-right font-medium text-[#111827] dark:text-[#e8eaf0] ${
                    col.align === 'right' ? '' : ''
                  }`}
                >
                  {cell(col, row)}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[480px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-[#e2e5ed] bg-[#f4f6f9] dark:border-[#2e3347] dark:bg-[#0f1117]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7] ${
                    col.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id || row._key || i}
                className="border-b border-[#e2e5ed] last:border-0 dark:border-[#2e3347]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[#111827] dark:text-[#e8eaf0] ${
                      col.align === 'right' ? 'text-right tabular-nums' : ''
                    }`}
                  >
                    {cell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const BTN_PRIMARY =
  'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40 sm:flex-none'
export const BTN_SECONDARY =
  'inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-6 font-semibold text-[#111827] transition-colors hover:border-amber-500 disabled:opacity-40 dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] sm:flex-none'

export function euro(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `${Number(v).toFixed(2)} €`
}
