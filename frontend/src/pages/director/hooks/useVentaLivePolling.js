import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getDashboardDirector,
  getMesas,
  getTicketDetalle,
  getTicketsHoy,
} from '../../../services/api'

const POLL_MS = 30000

async function fetchVentaLive() {
  const [dashRes, mesasRes, ticketsRes] = await Promise.all([
    getDashboardDirector(),
    getMesas(),
    getTicketsHoy(),
  ])
  return {
    dashboard: dashRes.data,
    mesas: Array.isArray(mesasRes.data) ? mesasRes.data : [],
    ticketsDia: Array.isArray(ticketsRes.data) ? ticketsRes.data : [],
  }
}

/**
 * Hook de referencia para la migración a React Query (Fase 8 del PRD de
 * hardening) de pantallas con polling. Ver `frontend/README.md` para el
 * patrón completo.
 *
 * Puntos clave que replican la regla del proyecto ("polling cada 30s, NUNCA
 * resetear datos en error"):
 * - `refetchInterval: POLL_MS` sustituye al `setInterval` manual.
 * - `retry: false`: un fallo de polling se refleja de inmediato en `error`,
 *   sin reintentos silenciosos que compliquen "cada cuánto se reintenta".
 * - React Query mantiene `data` (dashboard/mesas/tickets) intacto cuando un
 *   refetch en background falla — no hace falta lógica extra para eso, es el
 *   comportamiento por defecto (a diferencia de state manual con `useState`
 *   donde había que evitar pisar el estado en el `catch`).
 */
export function useVentaLivePolling() {
  const [panelTicketId, setPanelTicketId] = useState(null)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [panelAnimIn, setPanelAnimIn] = useState(false)
  // `now` se actualiza cada segundo vía efecto (nunca leyendo Date.now()
  // directamente en el cuerpo del hook, para mantenerlo puro en render).
  const [now, setNow] = useState(() => Date.now())

  const {
    data,
    error: queryError,
    isLoading,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['venta-live'],
    queryFn: fetchVentaLive,
    refetchInterval: POLL_MS,
    retry: false,
  })

  const dashboard = data?.dashboard ?? null
  const mesas = data?.mesas ?? []
  const ticketsDia = data?.ticketsDia ?? []
  const initialLoad = isLoading
  const isRefreshing = isFetching
  const error = queryError
    ? queryError.response?.data?.detail || 'No se pudieron actualizar los datos'
    : null
  const lastUpdated = dataUpdatedAt || now

  // `dataUpdatedAt` solo cambia con cada fetch exitoso; este tick fuerza un
  // re-render cada segundo para que "Actualizado hace X segundos" avance.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const secondsAgo = Math.max(0, Math.floor((now - lastUpdated) / 1000))

  const detalleQuery = useQuery({
    queryKey: ['ticket-detalle', panelTicketId],
    queryFn: () => getTicketDetalle(panelTicketId).then((r) => r.data),
    enabled: panelAbierto && !!panelTicketId,
    retry: false,
  })

  const ticketDetalle = detalleQuery.data ?? null
  const loadingDetalle = panelAbierto && detalleQuery.isLoading
  const detalleError = detalleQuery.error
    ? detalleQuery.error.response?.data?.detail || 'No se pudo cargar el detalle'
    : null

  useEffect(() => {
    // El cierre (`cerrarPanel`) ya resetea `panelAnimIn` a `false`
    // explícitamente como parte de la acción del usuario; este efecto solo
    // necesita disparar la animación de entrada al abrir.
    if (!panelAbierto) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPanelAnimIn(true))
    })
    return () => cancelAnimationFrame(id)
  }, [panelAbierto])

  const abrirDetalleTicket = useCallback((ticketId) => {
    if (!ticketId) return
    setPanelAbierto(true)
    setPanelTicketId(ticketId)
  }, [])

  const cerrarPanel = useCallback(() => {
    setPanelAbierto(false)
    setPanelAnimIn(false)
    setPanelTicketId(null)
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

  const ventasHoy = dashboard?.ventas_hoy ?? 0

  const mostrarPagosRegistrados =
    ticketDetalle &&
    String(ticketDetalle.metodo_pago || '').toLowerCase() === 'mixto' &&
    Array.isArray(ticketDetalle.pagos) &&
    ticketDetalle.pagos.length > 0

  return {
    dashboard,
    mesas,
    ticketsDia,
    initialLoad,
    error,
    lastUpdated,
    isRefreshing,
    secondsAgo,
    ticketDetalle,
    panelTicketId,
    loadingDetalle,
    panelAbierto,
    detalleError,
    panelAnimIn,
    mesasActivas,
    lineasSubtotalSum,
    topProductos,
    maxCantidad,
    ventasHoy,
    mostrarPagosRegistrados,
    abrirDetalleTicket,
    cerrarPanel,
  }
}
