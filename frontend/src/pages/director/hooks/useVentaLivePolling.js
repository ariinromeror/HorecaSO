import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getDashboardDirector,
  getMesas,
  getTicketDetalle,
  getTicketsHoy,
} from '../../../services/api'

const POLL_MS = 30000

export function useVentaLivePolling() {
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
