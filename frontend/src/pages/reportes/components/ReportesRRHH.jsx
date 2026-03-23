import { useMemo, useState } from 'react'
import { Loader2, Users } from 'lucide-react'
import { descargarPdf } from '../utilsPdf'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'

/** Valor input type=week (YYYY-Www) → lunes en YYYY-MM-DD (local). */
function weekToMondayIso(weekVal) {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekVal || '')
  if (!m) return ''
  const year = Number(m[1])
  const week = Number(m[2])
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7)
  const y = monday.getFullYear()
  const mm = String(monday.getMonth() + 1).padStart(2, '0')
  const dd = String(monday.getDate()).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

function currentWeekValue() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  const n = 1 + Math.round((d - w1) / 604800000)
  return `${d.getFullYear()}-W${String(n).padStart(2, '0')}`
}

export default function ReportesRRHH() {
  const defWeek = useMemo(() => currentWeekValue(), [])
  const [semana, setSemana] = useState(defWeek)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onCuadrante = () => {
    const mon = weekToMondayIso(semana)
    if (!mon) {
      setError('Selecciona una semana válida')
      setTimeout(() => setError(null), 3000)
      return
    }
    descargarPdf(
      `/reportes/cuadrante/${encodeURIComponent(mon)}`,
      setLoading,
      setError
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className={CARD}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          <Users size={20} strokeWidth={1.5} aria-hidden />
          Cuadrante semanal
        </h2>
        <p className="mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Turnos por empleado y día; PDF apaisado con totales.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="mb-1 block text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
              Semana (ISO)
            </label>
            <input
              type="week"
              className={INPUT}
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
            />
          </div>
          <button type="button" className={BTN} disabled={loading} onClick={onCuadrante}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
            ) : null}
            Descargar cuadrante PDF
          </button>
        </div>
      </div>

      <div className={CARD}>
        <h2 className="mb-1 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Rentabilidad por plato (BCG)
        </h2>
        <p className="mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Ingeniería de menú: márgenes, ventas últimos 30 días y matriz BCG.
        </p>
        <button
          type="button"
          className={BTN}
          disabled={loading}
          onClick={() =>
            descargarPdf('/reportes/rentabilidad-platos', setLoading, setError)
          }
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
          ) : null}
          Generar informe BCG
        </button>
      </div>
    </div>
  )
}
