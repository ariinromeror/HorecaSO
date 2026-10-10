import { Lock, Printer, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import {
  getCierreCajaPreview,
  postCierreCaja,
} from '../../services/api'
import { printViaAgentOrBrowser } from './components/TicketPrintView'
import CierreCajaPrintView, {
  METODOS,
  buildCierrePrintPayload,
} from './components/CierreCajaPrintView'

function fmtEuro(n) {
  return `${(Number(n) || 0).toFixed(2)} €`
}

function fmtFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).split('-')
  if (y && m && d) return `${d}/${m}/${y}`
  return iso
}

export default function CierreCajaPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cerrando, setCerrando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const tenantNombre =
    (data?.tenant_print?.razon_social &&
      String(data.tenant_print.razon_social).trim()) ||
    (data?.tenant_print?.nombre && String(data.tenant_print.nombre).trim()) ||
    (user?.tenant_nombre && String(user.tenant_nombre).trim()) ||
    'HorecaSO'

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCierreCajaPreview()
      setData(res.data)
    } catch (e) {
      if (e.response?.status === 404) {
        setError(
          'Endpoint no disponible; reinicia el backend y recarga la página.'
        )
      } else {
        const detail = e.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Error al cargar cierre de caja'
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  useEffect(() => {
    if (!feedback) return undefined
    const t = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(t)
  }, [feedback])

  const handleCerrar = async () => {
    if (!data || data.ya_cerrado || cerrando) return
    setCerrando(true)
    setError(null)
    try {
      const res = await postCierreCaja({ fecha: data.fecha })
      setData(res.data)
      setFeedback('Caja cerrada correctamente')
    } catch (e) {
      const detail = e.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'No se pudo registrar el cierre de caja'
      )
      if (e.response?.status === 409) {
        await loadPreview()
      }
    } finally {
      setCerrando(false)
    }
  }

  const handleImprimir = async () => {
    if (!data || imprimiendo) return
    setImprimiendo(true)
    try {
      const payload = buildCierrePrintPayload(data, tenantNombre)
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      )
      await printViaAgentOrBrowser(payload)
    } finally {
      setImprimiendo(false)
    }
  }

  if (loading && !data) {
    return <Loader />
  }

  if (error && !data) {
    return <EmptyState message={error} />
  }

  return (
    <div>
      <CierreCajaPrintView data={data} tenantNombre={tenantNombre} />

      <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-[#e2e5ed] pb-4 dark:border-[#2e3347]">
        <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          {fmtFecha(data?.fecha)} · {tenantNombre}
        </p>
        <button
          type="button"
          onClick={loadPreview}
          disabled={loading}
          className="ml-auto flex h-12 items-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] disabled:opacity-40"
        >
          <RefreshCw size={18} strokeWidth={1.5} aria-hidden />
          Actualizar
        </button>
      </header>

      {error ? (
        <div
          className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-[15px] text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {feedback ? (
        <div
          className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[15px] text-emerald-600 dark:text-emerald-400"
          role="status"
        >
          {feedback}
        </div>
      ) : null}

      {data?.ya_cerrado ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[15px] text-emerald-600 dark:text-emerald-400">
          <Lock size={18} strokeWidth={1.5} aria-hidden />
          Caja cerrada por {data.cerrado_por_nombre || '—'}
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[15px] text-amber-800 dark:text-amber-200">
          Pendiente de cierre · Cerrado por (al imprimir/cerrar):{' '}
          {data?.cerrado_por_nombre || user?.nombre || '—'}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {METODOS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-xl border border-[#e2e5ed] bg-white p-4 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]"
          >
            <p className="text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold text-amber-500">
              {fmtEuro(data?.[key])}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
              Total ventas
            </p>
            <p className="text-3xl font-bold text-[#111827] dark:text-[#e8eaf0]">
              {fmtEuro(data?.total_ventas)}
            </p>
          </div>
          <div className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
            <p>
              Tickets:{' '}
              <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                {data?.num_tickets ?? 0}
              </span>
            </p>
            <p>
              Ticket medio:{' '}
              <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                {fmtEuro(data?.ticket_medio)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleCerrar}
          disabled={cerrando || data?.ya_cerrado}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40"
        >
          <Lock size={20} strokeWidth={1.5} aria-hidden />
          {cerrando
            ? 'Cerrando…'
            : data?.ya_cerrado
              ? 'Ya cerrada'
              : 'Cerrar caja'}
        </button>
        <button
          type="button"
          onClick={handleImprimir}
          disabled={imprimiendo || !data}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-6 font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] disabled:opacity-40"
        >
          <Printer size={20} strokeWidth={1.5} aria-hidden />
          {imprimiendo ? 'Imprimiendo…' : 'Imprimir ticket'}
        </button>
      </div>
    </div>
  )
}
