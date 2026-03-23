import { useCallback, useEffect, useState } from 'react'
import {
  ChefHat,
  Clock,
  Moon,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  getKDSComandas,
  getKDSEstadisticas,
  patchKDSLineaEstado,
} from '../../services/api'

const ICON = { strokeWidth: 1.5, className: 'shrink-0' }

function badgeComandaClass(alerta) {
  switch (alerta) {
    case 'critico':
      return 'bg-red-500/10 text-red-500 dark:text-red-400'
    case 'warning':
      return 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
    default:
      return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  }
}

function badgeComandaLabel(alerta) {
  switch (alerta) {
    case 'critico':
      return 'Urgente'
    case 'warning':
      return 'Atención'
    default:
      return 'Al día'
  }
}

function cardTopBorder(alerta) {
  switch (alerta) {
    case 'critico':
      return 'border-t-4 border-t-red-500'
    case 'warning':
      return 'border-t-4 border-t-amber-500'
    default:
      return 'border-t-4 border-t-emerald-500'
  }
}

function cardBgClass(alerta) {
  if (alerta === 'critico') {
    return 'bg-red-500/5 dark:bg-red-500/5'
  }
  return 'bg-white dark:bg-[#1a1d27]'
}

function lineaWaitClass(alerta) {
  switch (alerta) {
    case 'critico':
      return 'text-red-500 dark:text-red-400 font-bold'
    case 'warning':
      return 'text-amber-500 dark:text-amber-400'
    default:
      return 'text-emerald-500 dark:text-emerald-400'
  }
}

function estadoBadgeClass(estado) {
  const e = (estado || 'pendiente').toLowerCase()
  if (e === 'preparando') {
    return 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
  }
  if (e === 'listo') {
    return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
  }
  return 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
}

function estadoLabel(estado) {
  const e = (estado || 'pendiente').toLowerCase()
  if (e === 'preparando') return 'Preparando'
  if (e === 'listo') return 'Listo'
  if (e === 'servido') return 'Servido'
  return 'Pendiente'
}

function minutosDesde(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.round((Date.now() - t) / 60000))
}

function tituloKdsPorRol(rol) {
  const r = String(rol || '').toLowerCase()
  if (r === 'barra') return 'Barra KDS'
  if (r === 'cocina') return 'Cocina KDS'
  return 'KDS — Sala'
}

export default function KDSPage() {
  const { isDark, toggleTheme } = useTheme()
  const { user } = useAuth()

  const [comandas, setComandas] = useState([])
  const [stats, setStats] = useState({
    platos_pendientes: 0,
    platos_preparando: 0,
    platos_listos_recogida: 0,
    platos_completados: 0,
    comandas_activas: 0,
    producto_mas_pedido: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [pollError, setPollError] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [comandasRes, statsRes] = await Promise.all([
        getKDSComandas(),
        getKDSEstadisticas(),
      ])
      setComandas(Array.isArray(comandasRes.data) ? comandasRes.data : [])
      setStats({
        platos_pendientes: statsRes.data?.platos_pendientes ?? 0,
        platos_preparando: statsRes.data?.platos_preparando ?? 0,
        platos_listos_recogida: statsRes.data?.platos_listos_recogida ?? 0,
        platos_completados: statsRes.data?.platos_completados ?? 0,
        comandas_activas: statsRes.data?.comandas_activas ?? 0,
        producto_mas_pedido: statsRes.data?.producto_mas_pedido ?? null,
      })
      setLastUpdate(new Date())
      setPollError(false)
    } catch (e) {
      console.error('KDS polling error:', e)
      setPollError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    setSecondsAgo(0)
  }, [lastUpdate])

  useEffect(() => {
    const timer = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [lastUpdate])

  const cambiarEstado = async (lineaId, nuevoEstado) => {
    try {
      await patchKDSLineaEstado(lineaId, nuevoEstado)
      const res = await getKDSComandas()
      setComandas(Array.isArray(res.data) ? res.data : [])
      setLastUpdate(new Date())
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cambiar estado')
      setTimeout(() => setError(null), 3000)
    }
  }

  const secText =
    lastUpdate == null
      ? '—'
      : secondsAgo < 60
        ? `${secondsAgo}s`
        : `${Math.floor(secondsAgo / 60)}m`

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f6f9] dark:bg-[#0f1117]">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#f4f6f9] dark:bg-[#0f1117]">
      <header className="sticky top-0 z-20 shrink-0 border-b border-[#e2e5ed] bg-white px-4 py-3 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <ChefHat
              {...ICON}
              className="h-8 w-8 text-amber-500"
              aria-hidden
            />
            <h1 className="text-xl font-bold text-[#111827] dark:text-[#f5f5f5]">
              Cocina KDS
            </h1>
            <div className="flex items-center gap-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    pollError ? 'bg-red-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    pollError ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                />
              </span>
              <span>
                Actualizado hace {secText}
                {pollError ? (
                  <WifiOff
                    {...ICON}
                    className="ml-1 inline h-4 w-4 text-red-400"
                    aria-hidden
                  />
                ) : (
                  <Wifi
                    {...ICON}
                    className="ml-1 inline h-4 w-4 text-emerald-500"
                    aria-hidden
                  />
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              <span className="text-amber-600 dark:text-amber-400">
                {stats.platos_pendientes}
              </span>{' '}
              pendientes ·{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {stats.platos_preparando}
              </span>{' '}
              preparando ·{' '}
              <span className="text-teal-600 dark:text-teal-400">
                {stats.platos_listos_recogida}
              </span>{' '}
              listos ·{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {stats.platos_completados}
              </span>{' '}
              ya salieron
            </p>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] p-2 dark:border-[#2e3347] dark:bg-[#222536]"
              aria-label={isDark ? 'Modo diurno' : 'Modo nocturno'}
            >
              {isDark ? (
                <Sun
                  size={20}
                  strokeWidth={1.5}
                  className="text-[#6b7280] dark:text-[#8b90a7]"
                />
              ) : (
                <Moon
                  size={20}
                  strokeWidth={1.5}
                  className="text-[#6b7280] dark:text-[#8b90a7]"
                />
              )}
            </button>
          </div>
        </div>
        {error ? (
          <div
            className="mx-auto mt-2 max-w-[1920px] rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-[1920px]">
          {comandas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ChefHat
                strokeWidth={1.5}
                className="mb-4 h-20 w-20 text-emerald-500 dark:text-emerald-400"
                aria-hidden
              />
              <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                Sin comandas pendientes
              </p>
              <p className="mt-2 text-base text-emerald-600/90 dark:text-emerald-400/90">
                La cocina está al día
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {comandas.map((c) => {
                const alerta = c.alerta_comanda || 'ok'
                const mesaLabel =
                  c.mesa_numero != null && c.mesa_numero !== ''
                    ? `Mesa ${c.mesa_numero}`
                    : 'Sin mesa'
                const zona = c.mesa_zona
                  ? String(c.mesa_zona).replace(/_/g, ' ')
                  : null
                const minsTicket = minutosDesde(c.ticket_created_at)

                return (
                  <article
                    key={c.ticket_id}
                    className={`flex flex-col overflow-hidden rounded-xl border border-[#e2e5ed] shadow-sm dark:border-[#2e3347] ${cardTopBorder(alerta)} ${cardBgClass(alerta)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold text-[#111827] dark:text-[#f5f5f5]">
                          {mesaLabel}
                        </h2>
                        {zona ? (
                          <p className="mt-0.5 text-sm capitalize text-[#6b7280] dark:text-[#9ca3af]">
                            {zona}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${badgeComandaClass(alerta)}`}
                      >
                        {badgeComandaLabel(alerta)}
                      </span>
                    </div>

                    <ul className="min-h-0 flex-1 divide-y divide-[#e2e5ed] dark:divide-[#2e3347]">
                      {(c.lineas || []).map((ln) => {
                        const est = (
                          ln.estado_kds ||
                          ln.estado_cocina ||
                          'pendiente'
                        ).toLowerCase()
                        const mins = Number(ln.minutos_espera ?? 0)
                        const waitLabel = `${mins}m`

                        return (
                          <li key={ln.id} className="p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-base font-medium text-[#111827] dark:text-[#e8eaf0]">
                                <span className="tabular-nums">
                                  {ln.cantidad}×
                                </span>{' '}
                                {ln.producto_nombre}
                              </p>
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 text-sm tabular-nums ${lineaWaitClass(ln.alerta)}`}
                              >
                                <Clock
                                  {...ICON}
                                  className="h-4 w-4"
                                  aria-hidden
                                />
                                {waitLabel}
                              </span>
                            </div>
                            {ln.nota ? (
                              <p className="mt-1 text-sm italic text-[#6b7280] dark:text-[#9ca3af]">
                                {ln.nota}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(est)}`}
                              >
                                {estadoLabel(est)}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {est === 'pendiente' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    cambiarEstado(ln.id, 'preparando')
                                  }
                                  className="h-10 min-w-[120px] rounded-lg bg-blue-500/15 px-4 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/25 dark:text-blue-400"
                                >
                                  Preparando
                                </button>
                              ) : null}
                              {est === 'preparando' ? (
                                <button
                                  type="button"
                                  onClick={() => cambiarEstado(ln.id, 'listo')}
                                  className="h-10 min-w-[120px] rounded-lg bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/25 dark:text-emerald-400"
                                >
                                  Listo
                                </button>
                              ) : null}
                              {est === 'listo' ? (
                                <button
                                  type="button"
                                  onClick={() => cambiarEstado(ln.id, 'servido')}
                                  className="h-10 min-w-[120px] rounded-lg bg-amber-500/15 px-4 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-400"
                                >
                                  Ya salió
                                </button>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    <footer className="border-t border-[#e2e5ed] p-3 text-sm text-[#6b7280] dark:text-[#9ca3af] dark:border-[#2e3347]">
                      {minsTicket != null ? (
                        <p>
                          Ticket abierto hace{' '}
                          <span className="font-medium tabular-nums">
                            {minsTicket} min
                          </span>
                        </p>
                      ) : (
                        <p>Ticket en curso</p>
                      )}
                    </footer>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
