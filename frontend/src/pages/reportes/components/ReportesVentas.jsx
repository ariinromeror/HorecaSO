import { useState } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'
import { descargarPdf } from '../utilsPdf'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40 md:w-auto'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportesVentas() {
  const [desde, setDesde] = useState(todayIso)
  const [hasta, setHasta] = useState(todayIso)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onGenerar = () => {
    const d0 = desde <= hasta ? desde : hasta
    const d1 = desde <= hasta ? hasta : desde
    const q = `?desde=${encodeURIComponent(d0)}&hasta=${encodeURIComponent(d1)}`
    descargarPdf(`/reportes/ventas${q}`, setLoading, setError)
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
          <TrendingUp size={20} strokeWidth={1.5} aria-hidden />
          Ventas por periodo
        </h2>
        <p className="mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Resumen diario de tickets cobrados en el rango indicado.
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="min-w-0 flex-1 md:max-w-xs">
            <label className="mb-1 block text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
              Desde
            </label>
            <input
              type="date"
              className={INPUT}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="min-w-0 flex-1 md:max-w-xs">
            <label className="mb-1 block text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
              Hasta
            </label>
            <input
              type="date"
              className={INPUT}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <button type="button" className={BTN} disabled={loading} onClick={onGenerar}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
            ) : null}
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
