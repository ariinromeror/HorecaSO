import { useMemo, useState } from 'react'
import { Eye, Loader2, Printer, Users } from 'lucide-react'
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

const DIA_LABEL = {
  lunes: 'Lun',
  martes: 'Mar',
  miércoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sábado: 'Sáb',
  domingo: 'Dom',
}

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
  const [pdfLoading, setPdfLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState(null)
  const [previewKind, setPreviewKind] = useState(null)
  const [cuadData, setCuadData] = useState(null)
  const [bcgData, setBcgData] = useState(null)

  const flashErr = (msg) => {
    setError(msg)
    setTimeout(() => setError(null), 3000)
  }

  const monday = () => weekToMondayIso(semana)

  const onCuadranteVer = async () => {
    const mon = monday()
    if (!mon) {
      flashErr('Selecciona una semana válida')
      return
    }
    setPreviewLoading(true)
    setError(null)
    setPreviewKind('cuadrante')
    try {
      const r = await api.get(
        `/reportes/cuadrante/${encodeURIComponent(mon)}/datos`
      )
      setCuadData(r.data)
    } catch (e) {
      setCuadData(null)
      flashErr(e.response?.data?.detail || 'Error al cargar cuadrante')
    } finally {
      setPreviewLoading(false)
    }
  }

  const onCuadrantePdf = () => {
    const mon = monday()
    if (!mon) {
      flashErr('Selecciona una semana válida')
      return
    }
    descargarPdf(
      `/reportes/cuadrante/${encodeURIComponent(mon)}`,
      setPdfLoading,
      setError
    )
  }

  const onBcgVer = async () => {
    setPreviewLoading(true)
    setError(null)
    setPreviewKind('bcg')
    try {
      const r = await api.get('/reportes/rentabilidad-platos/datos')
      setBcgData(r.data)
    } catch (e) {
      setBcgData(null)
      flashErr(e.response?.data?.detail || 'Error al cargar rentabilidad')
    } finally {
      setPreviewLoading(false)
    }
  }

  const busy = pdfLoading || previewLoading

  const diasKeys = cuadData?.dias_keys || Object.keys(DIA_LABEL)
  const cuadRows = (cuadData?.empleados || []).map((e) => {
    const row = { empleado: e.empleado, _key: e.empleado }
    for (const k of diasKeys) {
      row[k] = (e.dias && e.dias[k]) || '—'
    }
    return row
  })

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
          Turnos por empleado y día; vista en pantalla o PDF apaisado.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={busy}
              onClick={onCuadranteVer}
            >
              {previewLoading && previewKind === 'cuadrante' ? (
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
              onClick={onCuadrantePdf}
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

      {previewKind === 'cuadrante' ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={cuadData ? `Cuadrante ${cuadData.semana}` : 'Cuadrante'}
          emptyMessage="No hay turnos en esa semana."
          columns={[
            { key: 'empleado', label: 'Empleado' },
            ...diasKeys.map((k) => ({
              key: k,
              label: DIA_LABEL[k] || k,
            })),
          ]}
          rows={cuadRows}
        />
      ) : null}

      <div className={CARD}>
        <h2 className="mb-1 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Rentabilidad por plato (BCG)
        </h2>
        <p className="mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Ingeniería de menú: márgenes, ventas últimos 30 días y matriz BCG.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={busy}
            onClick={onBcgVer}
          >
            {previewLoading && previewKind === 'bcg' ? (
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
            onClick={() =>
              descargarPdf(
                '/reportes/rentabilidad-platos',
                setPdfLoading,
                setError
              )
            }
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

      {previewKind === 'bcg' ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={`Rentabilidad platos — ${bcgData?.periodo || 'últimos 30 días'}`}
          emptyMessage="No hay platos con receta para el informe."
          columns={[
            { key: 'nombre', label: 'Plato' },
            { key: 'categoria', label: 'Categoría' },
            {
              key: 'precio',
              label: 'PVP',
              align: 'right',
              format: (v) => euro(v),
            },
            {
              key: 'coste_calculado',
              label: 'Coste',
              align: 'right',
              format: (v) => euro(v),
            },
            {
              key: 'margen_porcentaje',
              label: 'Margen %',
              align: 'right',
              format: (v) =>
                v == null ? '—' : `${Number(v).toFixed(1)} %`,
            },
            {
              key: 'ventas_mes',
              label: 'Ud. 30d',
              align: 'right',
            },
          ]}
          rows={bcgData?.filas || []}
        />
      ) : null}
    </div>
  )
}
