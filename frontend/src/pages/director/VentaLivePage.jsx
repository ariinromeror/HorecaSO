import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ChevronRight, Users, X } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { tokens } from '../../constants/uiTokens'
import {
  getDashboardDirector,
  getMesas,
  getTicketDetalle,
  getTicketsHoy,
} from '../../services/api'

const POLL_MS = 30000

function mesaEstadoKey(estado) {
  const e = String(estado || '')
    .toLowerCase()
    .trim()
  if (['libre', 'ocupada', 'reservada', 'bloqueada'].includes(e)) {
    return e
  }
  return 'bloqueada'
}

const chairPositions = [
  { top: '-6px', left: '50%', transform: 'translateX(-50%)' },
  { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' },
  { left: '-6px', top: '50%', transform: 'translateY(-50%)' },
  { right: '-6px', top: '50%', transform: 'translateY(-50%)' },
]

function MesaCardLive({ mesa, onNavigate }) {
  const estado = mesaEstadoKey(mesa.estado)
  const t = tokens.shared.mesa[estado]
  const clickable = estado === 'libre' || estado === 'ocupada'

  const handleClick = () => {
    if (clickable) onNavigate(mesa.id)
  }

  const handleKeyDown = (e) => {
    if (!clickable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onNavigate(mesa.id)
    }
  }

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'relative w-full max-w-[148px] transition-transform',
        clickable
          ? 'cursor-pointer hover:scale-105'
          : 'cursor-not-allowed opacity-60',
      ].join(' ')}
    >
      <div
        className="relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 p-3"
        style={{
          borderColor: t.border,
          background: t.bg,
        }}
      >
        {chairPositions.map((pos, i) => (
          <span
            key={i}
            className="absolute h-3 w-3 rounded-full"
            style={{
              ...pos,
              backgroundColor: t.border,
            }}
            aria-hidden
          />
        ))}

        <span
          className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          style={{
            color: t.text,
            background: t.bg,
            border: `1px solid ${t.border}`,
          }}
        >
          {t.label}
        </span>

        <span
          className="text-2xl font-bold"
          style={{ color: t.text }}
        >
          {mesa.numero}
        </span>
        <span className="mt-1 text-[11px] text-[#6b7280] dark:text-[#8b90a7]">
          {mesa.zona || '—'}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[11px] text-[#9ca3af]">
          <Users size={11} strokeWidth={1.5} aria-hidden />
          {mesa.capacidad ?? '—'} pax
        </span>
      </div>
    </div>
  )
}

function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

const METODO_LABEL = {
  efectivo: 'Efectivo',
  tarjeta_credito: 'Tarjeta crédito',
  tarjeta_debito: 'Tarjeta débito',
  bizum: 'Bizum',
  transferencia: 'Transferencia',
  invitacion: 'Invitación',
  mixto: 'Mixto',
}

function metodoEtiqueta(mp) {
  if (!mp) return '—'
  return METODO_LABEL[mp] || mp
}

function horaDesdeIso(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '—'
  }
}

function fechaHoraDesdeIso(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '—'
  }
}

function ticketIdCorto(id) {
  if (!id) return '—'
  const s = String(id).replace(/-/g, '')
  return s.slice(-8).toUpperCase()
}

function EstadoBadge({ estado }) {
  const e = String(estado || '').toLowerCase()
  if (e === 'abierto') {
    return (
      <span className="inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
        Abierto
      </span>
    )
  }
  if (e === 'cobrado') {
    return (
      <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
        Cobrado
      </span>
    )
  }
  if (e === 'anulado') {
    return (
      <span className="inline-flex rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
        Anulado
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-md bg-[#e2e5ed] px-2 py-0.5 text-xs font-semibold text-[#6b7280] dark:bg-[#2e3347] dark:text-[#9ca3af]">
      {estado || '—'}
    </span>
  )
}

function MetodoBadgeTabla({ metodoPago }) {
  if (metodoPago == null) {
    return <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">—</span>
  }
  if (String(metodoPago).toLowerCase() === 'mixto') {
    return (
      <span className="inline-flex rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
        Dividido
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-md border border-[#e2e5ed] bg-[#f0f2f5] px-2 py-0.5 text-[11px] font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]">
      {metodoEtiqueta(metodoPago)}
    </span>
  )
}

export default function VentaLivePage() {
  const navigate = useNavigate()

  const [dashboard, setDashboard] = useState(null)
  const [mesas, setMesas] = useState([])
  const [ticketsDia, setTicketsDia] = useState([])
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(() => Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const [ticketDetalle, setTicketDetalle] = useState(null)
  const [panelTicketId, setPanelTicketId] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [detalleError, setDetalleError] = useState(null)
  const [panelAnimIn, setPanelAnimIn] = useState(false)

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const [dashRes, mesasRes, ticketsRes] = await Promise.all([
        getDashboardDirector(),
        getMesas(),
        getTicketsHoy(),
      ])
      setDashboard(dashRes.data)
      setMesas(Array.isArray(mesasRes.data) ? mesasRes.data : [])
      const raw = Array.isArray(ticketsRes.data) ? ticketsRes.data : []
      setTicketsDia(raw)
      setLastUpdated(Date.now())
    } catch (e) {
      setError(
        e.response?.data?.detail || 'No se pudieron actualizar los datos'
      )
    } finally {
      setIsRefreshing(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, POLL_MS)
    return () => clearInterval(interval)
  }, [fetchAll])

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  useEffect(() => {
    if (!panelAbierto) {
      setPanelAnimIn(false)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPanelAnimIn(true))
    })
    return () => cancelAnimationFrame(id)
  }, [panelAbierto])

  const abrirDetalleTicket = useCallback(async (ticketId) => {
    if (!ticketId) return
    setPanelAbierto(true)
    setPanelTicketId(ticketId)
    setLoadingDetalle(true)
    setTicketDetalle(null)
    setDetalleError(null)
    try {
      const r = await getTicketDetalle(ticketId)
      setTicketDetalle(r.data)
    } catch (e) {
      setDetalleError(
        e.response?.data?.detail || 'No se pudo cargar el detalle'
      )
    } finally {
      setLoadingDetalle(false)
    }
  }, [])

  const cerrarPanel = useCallback(() => {
    setPanelAbierto(false)
    setPanelAnimIn(false)
    setPanelTicketId(null)
    setTicketDetalle(null)
    setDetalleError(null)
    setLoadingDetalle(false)
  }, [])

  const mesasActivas = useMemo(() => {
    return mesas.filter((m) => {
      const e = String(m.estado || '').toLowerCase().trim()
      return e === 'libre' || e === 'ocupada'
    })
  }, [mesas])

  const lineasSubtotalSum = useMemo(() => {
    const lineas = ticketDetalle?.lineas
    if (!Array.isArray(lineas)) return 0
    return lineas.reduce((s, ln) => s + (Number(ln.subtotal) || 0), 0)
  }, [ticketDetalle?.lineas])

  const topProductos = dashboard?.top_5_productos_hoy ?? []
  const maxCantidad = useMemo(() => {
    if (!topProductos.length) return 1
    return Math.max(...topProductos.map((p) => Number(p.cantidad) || 0), 1)
  }, [topProductos])

  const goTpv = (id) => navigate(`/tpv/${id}`)

  if (initialLoad && !dashboard && !error) {
    return <Loader />
  }

  if (error && !dashboard) {
    return <EmptyState message={error} />
  }

  const ventasHoy = dashboard?.ventas_hoy ?? 0

  const mostrarPagosRegistrados =
    ticketDetalle &&
    String(ticketDetalle.metodo_pago || '').toLowerCase() === 'mixto' &&
    Array.isArray(ticketDetalle.pagos) &&
    ticketDetalle.pagos.length > 0

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-[#0f1117]">
      <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-[#e2e5ed] pb-4 dark:border-[#2e3347]">
        <Activity
          size={28}
          strokeWidth={1.5}
          className="text-amber-500"
          aria-hidden
        />
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Venta Live
        </h1>
        <div className="ml-auto flex items-center gap-2 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isRefreshing
                ? 'animate-pulse bg-emerald-500'
                : 'bg-[#9ca3af] dark:bg-[#5a5f7a]'
            }`}
            aria-hidden
          />
          <span>
            Actualizado hace {secondsAgo} segundo{secondsAgo === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      {error ? (
        <div
          className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[15px] text-amber-800 dark:text-amber-200"
          role="status"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Total acumulado — col-span-full */}
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-8 text-center shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-3">
          <p className="text-6xl font-bold text-amber-500">
            {formatEuro(ventasHoy)}
          </p>
          <p className="mt-2 text-[15px] font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Ventas de hoy
          </p>
        </div>

        {/* Mesas activas — 2/3 */}
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Mesas activas ahora
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
            {mesasActivas.map((mesa) => (
              <MesaCardLive key={mesa.id} mesa={mesa} onNavigate={goTpv} />
            ))}
          </div>
          {mesasActivas.length === 0 ? (
            <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
              No hay mesas libres u ocupadas para mostrar.
            </p>
          ) : null}
        </div>

        {/* Top productos — 1/3 */}
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Top productos del día
          </h2>
          {topProductos.length === 0 ? (
            <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
              Sin ventas hoy
            </p>
          ) : (
            topProductos.map((item, i) => {
              const c = Number(item.cantidad) || 0
              const pct = (c / maxCantidad) * 100
              return (
                <div
                  key={`${item.nombre}-${i}`}
                  className="mb-3 flex items-center gap-3"
                >
                  <span className="flex-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    {item.nombre}
                  </span>
                  <span className="w-8 text-right text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    {c}
                  </span>
                  <div className="h-2 w-32 shrink-0 rounded-full bg-[#f0f2f5] dark:bg-[#222536]">
                    <div
                      className="h-2 rounded-full bg-amber-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Tickets del día — full width */}
        <div className="overflow-hidden rounded-xl border border-[#e2e5ed] bg-white shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-3">
          <div className="border-b border-[#e2e5ed] p-6 dark:border-[#2e3347]">
            <h2 className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Tickets del día
            </h2>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Todos los tickets del local creados hoy (actualización cada 30 s)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Hora
                  </th>
                  <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Mesa
                  </th>
                  <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Camarero
                  </th>
                  <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Estado
                  </th>
                  <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Productos
                  </th>
                  <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Total
                  </th>
                  <th className="px-4 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Método
                  </th>
                  <th
                    className="w-10 px-2 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                    aria-label="Abrir detalle"
                  />
                </tr>
              </thead>
              <tbody>
                {ticketsDia.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                    >
                      No hay tickets para mostrar
                    </td>
                  </tr>
                ) : (
                  ticketsDia.map((t) => {
                    const est = String(t.estado || '').toLowerCase()
                    const totalClass =
                      est === 'cobrado'
                        ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                        : est === 'abierto'
                          ? 'font-semibold text-amber-500'
                          : 'font-medium text-[#111827] dark:text-[#e8eaf0]'
                    const numLineas = Number(t.num_lineas) || 0
                    return (
                      <tr
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => abrirDetalleTicket(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            abrirDetalleTicket(t.id)
                          }
                        }}
                        className="cursor-pointer border-b border-[#e2e5ed] transition-colors hover:bg-[#f0f2f5] dark:border-[#2e3347] dark:hover:bg-[#222536]"
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                          {horaDesdeIso(t.created_at)}
                        </td>
                        <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                          {t.mesa_numero != null && t.mesa_numero !== ''
                            ? String(t.mesa_numero)
                            : 'Sin mesa'}
                        </td>
                        <td className="max-w-[8rem] truncate px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                          {t.camarero_nombre || '—'}
                        </td>
                        <td className="px-4 py-2">
                          <EstadoBadge estado={t.estado} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                          {numLineas} productos
                        </td>
                        <td className={`whitespace-nowrap px-4 py-2 ${totalClass}`}>
                          {formatEuro(t.total)}
                        </td>
                        <td className="px-4 py-2">
                          <MetodoBadgeTabla metodoPago={t.metodo_pago} />
                        </td>
                        <td className="px-2 py-2 text-[#9ca3af]">
                          <ChevronRight
                            size={18}
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {panelAbierto ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Cerrar panel"
            onClick={cerrarPanel}
          />
          <aside
            className={[
              'fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-[#e2e5ed] bg-white shadow-xl transition-transform duration-200 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:w-80 md:w-96',
              panelAnimIn ? 'translate-x-0' : 'translate-x-full',
            ].join(' ')}
            role="dialog"
            aria-modal="true"
            aria-labelledby="venta-live-panel-title"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
              <div className="min-w-0">
                <h2
                  id="venta-live-panel-title"
                  className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
                >
                  Ticket #
                  {ticketDetalle
                    ? ticketIdCorto(ticketDetalle.id)
                    : panelTicketId
                      ? ticketIdCorto(panelTicketId)
                      : '…'}
                </h2>
                {ticketDetalle ? (
                  <div className="mt-2">
                    <EstadoBadge estado={ticketDetalle.estado} />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={cerrarPanel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
                aria-label="Cerrar"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loadingDetalle ? (
                <div className="flex justify-center py-12">
                  <Loader />
                </div>
              ) : detalleError ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {detalleError}
                </p>
              ) : ticketDetalle ? (
                <>
                  <section className="mb-6 space-y-2 text-sm text-[#111827] dark:text-[#e8eaf0]">
                    <p>
                      <span className="text-[#6b7280] dark:text-[#8b90a7]">
                        Mesa:{' '}
                      </span>
                      {ticketDetalle.mesa_numero != null &&
                      ticketDetalle.mesa_numero !== ''
                        ? String(ticketDetalle.mesa_numero)
                        : 'Sin mesa'}
                    </p>
                    <p>
                      <span className="text-[#6b7280] dark:text-[#8b90a7]">
                        Camarero:{' '}
                      </span>
                      {ticketDetalle.camarero_nombre || '—'}
                    </p>
                    <p>
                      <span className="text-[#6b7280] dark:text-[#8b90a7]">
                        Hora apertura:{' '}
                      </span>
                      {fechaHoraDesdeIso(ticketDetalle.created_at)}
                    </p>
                    <p>
                      <span className="text-[#6b7280] dark:text-[#8b90a7]">
                        Hora cobro:{' '}
                      </span>
                      {ticketDetalle.cobrado_at
                        ? fechaHoraDesdeIso(ticketDetalle.cobrado_at)
                        : '—'}
                    </p>
                    <p>
                      <span className="text-[#6b7280] dark:text-[#8b90a7]">
                        Tiempo ocupación:{' '}
                      </span>
                      {ticketDetalle.tiempo_ocupacion != null
                        ? `${ticketDetalle.tiempo_ocupacion} minutos`
                        : '—'}
                    </p>
                    <p>
                      <span className="text-[#6b7280] dark:text-[#8b90a7]">
                        Comensales:{' '}
                      </span>
                      {ticketDetalle.num_comensales ?? '—'}
                    </p>
                  </section>

                  <section className="mb-6">
                    <table className="w-full text-left text-xs text-[#111827] dark:text-[#e8eaf0]">
                      <thead>
                        <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                          <th className="py-1.5 pr-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Producto
                          </th>
                          <th className="py-1.5 pr-2 text-right font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Cant.
                          </th>
                          <th className="py-1.5 pr-2 text-right font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            P. Unit
                          </th>
                          <th className="py-1.5 text-right font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ticketDetalle.lineas || []).map((ln) => (
                          <tr
                            key={ln.id}
                            className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                          >
                            <td className="max-w-[10rem] truncate py-1.5 pr-2">
                              {ln.producto_nombre || '—'}
                            </td>
                            <td className="py-1.5 pr-2 text-right">
                              {ln.cantidad}
                            </td>
                            <td className="py-1.5 pr-2 text-right">
                              {formatEuro(ln.precio_unitario)}
                            </td>
                            <td className="py-1.5 text-right">
                              {formatEuro(ln.subtotal)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td
                            colSpan={3}
                            className="py-2 pr-2 text-right text-[#6b7280] dark:text-[#8b90a7]"
                          >
                            Total líneas
                          </td>
                          <td className="py-2 text-right">
                            {formatEuro(lineasSubtotalSum)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </section>

                  {mostrarPagosRegistrados ? (
                    <section className="mb-6">
                      <h3 className="mb-2 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        Pagos registrados
                      </h3>
                      <ul className="space-y-1.5 text-sm text-[#111827] dark:text-[#e8eaf0]">
                        {ticketDetalle.pagos.map((p) => (
                          <li
                            key={p.id}
                            className="flex justify-between gap-2 border-b border-[#e2e5ed] py-1 dark:border-[#2e3347]"
                          >
                            <span>{metodoEtiqueta(p.metodo_pago)}</span>
                            <span className="font-medium">
                              {formatEuro(p.importe)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <p className="text-xl font-bold text-amber-500">
                    Total: {formatEuro(ticketDetalle.total)}
                  </p>
                </>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  )
}
