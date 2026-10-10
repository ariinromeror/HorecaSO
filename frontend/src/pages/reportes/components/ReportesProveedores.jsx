import { useEffect, useState } from 'react'
import { ClipboardList, Eye, Loader2, Printer, Truck } from 'lucide-react'
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
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportesProveedores() {
  const [articulos, setArticulos] = useState([])
  const [artId, setArtId] = useState('')
  const [desde, setDesde] = useState(todayIso)
  const [hasta, setHasta] = useState(todayIso)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState(null)
  const [previewKind, setPreviewKind] = useState(null)
  const [compData, setCompData] = useState(null)
  const [appccData, setAppccData] = useState(null)

  useEffect(() => {
    let ok = true
    ;(async () => {
      try {
        const r = await api.get('/inventario/articulos')
        const list = Array.isArray(r.data) ? r.data : []
        if (ok) setArticulos(list)
      } catch {
        if (ok) setArticulos([])
      }
    })()
    return () => {
      ok = false
    }
  }, [])

  const flashErr = (msg) => {
    setError(msg)
    setTimeout(() => setError(null), 3000)
  }

  const onComparativaVer = async () => {
    if (!artId) {
      flashErr('Selecciona un artículo')
      return
    }
    setPreviewLoading(true)
    setError(null)
    setPreviewKind('comparativa')
    try {
      const r = await api.get(
        `/reportes/comparativa-proveedores/${encodeURIComponent(artId)}/datos`
      )
      setCompData(r.data)
    } catch (e) {
      setCompData(null)
      flashErr(e.response?.data?.detail || 'Error al cargar comparativa')
    } finally {
      setPreviewLoading(false)
    }
  }

  const onComparativaPdf = () => {
    if (!artId) {
      flashErr('Selecciona un artículo')
      return
    }
    descargarPdf(
      `/reportes/comparativa-proveedores/${encodeURIComponent(artId)}`,
      setPdfLoading,
      setError
    )
  }

  const rango = () => {
    const d0 = desde <= hasta ? desde : hasta
    const d1 = desde <= hasta ? hasta : desde
    return { d0, d1 }
  }

  const onAppccVer = async () => {
    const { d0, d1 } = rango()
    setPreviewLoading(true)
    setError(null)
    setPreviewKind('appcc')
    try {
      const r = await api.get('/reportes/appcc/datos', {
        params: { desde: d0, hasta: d1 },
      })
      setAppccData(r.data)
    } catch (e) {
      setAppccData(null)
      flashErr(e.response?.data?.detail || 'Error al cargar APPCC')
    } finally {
      setPreviewLoading(false)
    }
  }

  const onAppccPdf = () => {
    const { d0, d1 } = rango()
    const q = `?desde=${encodeURIComponent(d0)}&hasta=${encodeURIComponent(d1)}`
    descargarPdf(`/reportes/appcc${q}`, setPdfLoading, setError)
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
          <Truck size={20} strokeWidth={1.5} aria-hidden />
          Comparativa de precios por proveedor
        </h2>
        <p className="mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Histórico de compras y precios por artículo de almacén.
        </p>
        <div className="min-w-0 space-y-3">
          <select
            className={`${INPUT} block`}
            value={artId}
            onChange={(e) => setArtId(e.target.value)}
          >
            <option value="">Artículo…</option>
            {articulos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre || a.sku || a.id}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={busy || !artId}
              onClick={onComparativaVer}
            >
              {previewLoading && previewKind === 'comparativa' ? (
                <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
              ) : (
                <Eye size={18} strokeWidth={1.5} />
              )}
              Ver en pantalla
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={busy || !artId}
              onClick={onComparativaPdf}
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

      {previewKind === 'comparativa' ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={
            compData
              ? `Comparativa — ${compData.articulo_nombre}`
              : 'Comparativa proveedores'
          }
          emptyMessage="No hay compras de ese artículo a proveedores."
          columns={[
            { key: 'proveedor', label: 'Proveedor' },
            {
              key: 'precio_actual',
              label: 'Precio actual',
              align: 'right',
              format: (v) => euro(v),
            },
            {
              key: 'precio_min',
              label: 'Mín.',
              align: 'right',
              format: (v) => euro(v),
            },
            {
              key: 'precio_max',
              label: 'Máx.',
              align: 'right',
              format: (v) => euro(v),
            },
            { key: 'ultima_compra', label: 'Última compra' },
            {
              key: 'num_compras',
              label: 'Compras',
              align: 'right',
            },
          ]}
          rows={compData?.precios || []}
        />
      ) : null}

      <div className={CARD}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          <ClipboardList size={20} strokeWidth={1.5} aria-hidden />
          Registro APPCC
        </h2>
        <p className="mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Listado de registros de autocontrol en el periodo (CE 852/2004).
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
              onClick={onAppccVer}
            >
              {previewLoading && previewKind === 'appcc' ? (
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
              onClick={onAppccPdf}
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

      {previewKind === 'appcc' ? (
        <ReportesPreviewTable
          loading={previewLoading}
          title={
            appccData
              ? `APPCC ${appccData.desde} → ${appccData.hasta}`
              : 'Registro APPCC'
          }
          emptyMessage="No hay registros APPCC en ese periodo."
          summary={
            appccData ? (
              <span>{appccData.total || 0} registros</span>
            ) : null
          }
          columns={[
            {
              key: 'created_at',
              label: 'Fecha',
              format: (v) =>
                v ? String(v).slice(0, 16).replace('T', ' ') : '—',
            },
            { key: 'tipo_control', label: 'Tipo' },
            { key: 'nombre_equipo', label: 'Equipo' },
            {
              key: 'temperatura',
              label: 'Temp.',
              align: 'right',
              format: (v) => (v == null ? '—' : `${v} °C`),
            },
            {
              key: 'conforme',
              label: 'Conforme',
              format: (v) => (v === true ? 'Sí' : v === false ? 'No' : '—'),
            },
            { key: 'responsable', label: 'Responsable' },
            {
              key: 'observaciones',
              label: 'Obs.',
              format: (v) => (v ? String(v) : '—'),
            },
          ]}
          rows={appccData?.filas || []}
        />
      ) : null}
    </div>
  )
}
