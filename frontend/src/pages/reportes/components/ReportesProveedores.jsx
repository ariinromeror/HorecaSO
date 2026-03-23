import { useEffect, useState } from 'react'
import { ClipboardList, Loader2, Truck } from 'lucide-react'
import api from '../../../services/api'
import { descargarPdf } from '../utilsPdf'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportesProveedores() {
  const [articulos, setArticulos] = useState([])
  const [artId, setArtId] = useState('')
  const [desde, setDesde] = useState(todayIso)
  const [hasta, setHasta] = useState(todayIso)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  const onComparativa = () => {
    if (!artId) {
      setError('Selecciona un artículo')
      setTimeout(() => setError(null), 3000)
      return
    }
    descargarPdf(
      `/reportes/comparativa-proveedores/${encodeURIComponent(artId)}`,
      setLoading,
      setError
    )
  }

  const onAppcc = () => {
    const d0 = desde <= hasta ? desde : hasta
    const d1 = desde <= hasta ? hasta : desde
    const q = `?desde=${encodeURIComponent(d0)}&hasta=${encodeURIComponent(d1)}`
    descargarPdf(`/reportes/appcc${q}`, setLoading, setError)
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
          <button type="button" className={BTN} disabled={loading} onClick={onComparativa}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
            ) : null}
            Descargar comparativa PDF
          </button>
        </div>
      </div>

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
          <button type="button" className={BTN} disabled={loading} onClick={onAppcc}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
            ) : null}
            Descargar APPCC PDF
          </button>
        </div>
      </div>
    </div>
  )
}
