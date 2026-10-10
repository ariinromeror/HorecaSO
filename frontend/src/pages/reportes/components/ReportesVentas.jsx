import { useState } from 'react'
import { Eye, Loader2, Printer, TrendingUp } from 'lucide-react'
import api from '../../../services/api'
import { descargarPdf } from '../utilsPdf'
import ReportesPreviewTable, {
  BTN_PRIMARY,
  BTN_SECONDARY,
  euro,
} from './ReportesPreviewTable'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportesVentas() {
  const [desde, setDesde] = useState(todayIso)
  const [hasta, setHasta] = useState(todayIso)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const rango = () => {
    const d0 = desde <= hasta ? desde : hasta
    const d1 = desde <= hasta ? hasta : desde
    return { d0, d1, q: `?desde=${encodeURIComponent(d0)}&hasta=${encodeURIComponent(d1)}` }
  }

  const onVer = async () => {
    const { d0, d1 } = rango()
    setPreviewLoading(true)
    setError(null)
    setShowPreview(true)
    try {
      const r = await api.get('/reportes/ventas/datos', {
        params: { desde: d0, hasta: d1 },
      })
      setData(r.data)
    } catch (e) {
      setData(null)
      setError(e.response?.data?.detail || 'Error al cargar ventas')
      setTimeout(() => setError(null), 3000)
    } finally {
      setPreviewLoading(false)
    }
  }

  const onPdf = () => {
    const { q } = rango()
    descargarPdf(`/reportes/ventas${q}`, setPdfLoading, setError)
  }

  const busy = pdfLoading || previewLoading

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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={busy}
              onClick={onVer}
            >
              {previewLoading ? (
                <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
              ) : (
                <Eye size={18} strokeWidth={1.5} />
              )}
              Ver en pantalla
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={busy}
              onClick={onPdf}
            >
              {pdfLoading ? (
                <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
              ) : (
                <Printer size={18} strokeWidth={1.5} />
              )}
              Generar PDF
            </button>
          </div>
        </div>
      </div>

      {showPreview ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={
            data
              ? `Ventas ${data.desde} → ${data.hasta}`
              : 'Ventas por periodo'
          }
          emptyMessage="No hay ventas cobradas en ese periodo."
          summary={
            data?.resumen ? (
              <span>
                Total {euro(data.resumen.total)} · Ticket medio{' '}
                {euro(data.resumen.ticket_medio)} ·{' '}
                {data.resumen.total_tickets || 0} tickets · Mejor día:{' '}
                {data.resumen.mejor_dia || '—'}
              </span>
            ) : null
          }
          columns={[
            { key: 'fecha', label: 'Fecha' },
            {
              key: 'tickets',
              label: 'Tickets',
              align: 'right',
            },
            {
              key: 'ventas',
              label: 'Ventas',
              align: 'right',
              format: (v) => euro(v),
            },
            {
              key: 'iva',
              label: 'IVA',
              align: 'right',
              format: (v) => euro(v),
            },
          ]}
          rows={data?.filas || []}
        />
      ) : null}
    </div>
  )
}
