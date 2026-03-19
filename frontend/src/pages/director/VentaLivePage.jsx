import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Users } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { tokens } from '../../constants/uiTokens'
import {
  getDashboardDirector,
  getMesas,
  getTicketsCobradosHoy,
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
    })
  } catch {
    return '—'
  }
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

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const [dashRes, mesasRes, ticketsRes] = await Promise.all([
        getDashboardDirector(),
        getMesas(),
        getTicketsCobradosHoy(),
      ])
      setDashboard(dashRes.data)
      setMesas(Array.isArray(mesasRes.data) ? mesasRes.data : [])
      const raw = Array.isArray(ticketsRes.data) ? ticketsRes.data : []
      const sorted = [...raw].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime()
        const tb = new Date(b.created_at || 0).getTime()
        return tb - ta
      })
      setTicketsDia(sorted)
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

  const mesasActivas = useMemo(() => {
    return mesas.filter((m) => {
      const e = String(m.estado || '').toLowerCase().trim()
      return e === 'libre' || e === 'ocupada'
    })
  }, [mesas])

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

        {/* Tickets recientes — full width */}
        <div className="overflow-hidden rounded-xl border border-[#e2e5ed] bg-white shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-3">
          <div className="border-b border-[#e2e5ed] p-6 dark:border-[#2e3347]">
            <h2 className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Tickets del día
            </h2>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Últimos movimientos (tickets en curso y datos en vivo)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-6 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Hora
                  </th>
                  <th className="px-6 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Mesa
                  </th>
                  <th className="px-6 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Total
                  </th>
                  <th className="px-6 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Método de pago
                  </th>
                </tr>
              </thead>
              <tbody>
                {ticketsDia.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                    >
                      No hay tickets para mostrar
                    </td>
                  </tr>
                ) : (
                  ticketsDia.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                    >
                      <td className="px-6 py-3 text-[#111827] dark:text-[#e8eaf0]">
                        {horaDesdeIso(t.cobrado_at || t.created_at)}
                      </td>
                      <td className="px-6 py-3 text-[#111827] dark:text-[#e8eaf0]">
                        {t.mesa_numero ?? '—'}
                      </td>
                      <td className="px-6 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {formatEuro(t.total)}
                      </td>
                      <td className="px-6 py-3 text-[#111827] dark:text-[#e8eaf0]">
                        {metodoEtiqueta(t.metodo_pago)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
