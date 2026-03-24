import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicketPagos } from '../../../services/api'
import { agruparLineasTicket, totalUnidadesLineas } from '../utils/lineasTicket'
import { loadTpvMesa } from '../utils/loadTpvMesa'
import { useTpvTicketHandlers } from './useTpvTicketHandlers'

export function useTicketTPV() {
  const { mesaId } = useParams()
  const navigate = useNavigate()

  const [carta, setCarta] = useState([])
  const [categActiva, setCategActiva] = useState(0)
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [activeTab, setActiveTab] = useState('carta')
  const [actionLoading, setActionLoading] = useState({})
  const [cobrarLoading, setCobrarLoading] = useState(false)
  const [modoDivision, setModoDivision] = useState(false)
  const [pagosRegistrados, setPagosRegistrados] = useState([])
  const [importePago, setImportePago] = useState('')
  const [metodoPagoDivision, setMetodoPagoDivision] = useState('efectivo')
  const [loadingPago, setLoadingPago] = useState(false)
  const [divisionError, setDivisionError] = useState('')
  const [numPartesInput, setNumPartesInput] = useState('2')
  const [borradorPartesPagos, setBorradorPartesPagos] = useState(null)
  const [tpvReloadKey, setTpvReloadKey] = useState(0)
  const [liberarMesaLoading, setLiberarMesaLoading] = useState(false)

  const productoNombrePorId = useMemo(() => {
    const map = new Map()
    for (const bloque of carta) {
      for (const p of bloque.productos || []) {
        map.set(String(p.id), p.nombre)
      }
    }
    return map
  }, [carta])

  const categorias = useMemo(
    () => carta.map((b) => b.categoria).filter(Boolean),
    [carta]
  )

  const productosActivos = carta[categActiva]?.productos || []

  useEffect(() => {
    let cancelled = false
    const isCancelled = () => cancelled
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        await loadTpvMesa({
          mesaId,
          isCancelled,
          setCarta,
          setCategActiva,
          setTicket,
          setError,
        })
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || 'Error al cargar el TPV')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mesaId, tpvReloadKey])

  useEffect(() => {
    if (!divisionError) return
    const t = setTimeout(() => setDivisionError(''), 3000)
    return () => clearTimeout(t)
  }, [divisionError])

  useEffect(() => {
    setModoDivision(false)
    setPagosRegistrados([])
    setImportePago('')
    setDivisionError('')
    setNumPartesInput('2')
    setBorradorPartesPagos(null)
  }, [ticket?.id])

  const loadPagosDivision = useCallback(async () => {
    if (!ticket?.id) return
    try {
      const r = await getTicketPagos(ticket.id)
      const list = Array.isArray(r.data?.pagos) ? r.data.pagos : []
      setPagosRegistrados(
        list.map((p) => ({
          id: p.id,
          importe: Number(p.importe),
          metodo_pago: p.metodo_pago,
        }))
      )
    } catch {
      setPagosRegistrados([])
    }
  }, [ticket?.id])

  const totalPagado = useMemo(
    () =>
      pagosRegistrados.reduce((s, p) => s + (Number(p.importe) || 0), 0),
    [pagosRegistrados]
  )

  const pendienteDivision = useMemo(() => {
    const total = Number(ticket?.total) || 0
    const raw = Math.round((total - totalPagado) * 100) / 100
    return raw < 0 ? 0 : raw
  }, [ticket?.total, totalPagado])

  const lineasAgrupadas = useMemo(
    () => agruparLineasTicket(ticket?.lineas),
    [ticket?.lineas]
  )

  const totalUnidadesComanda = useMemo(
    () => totalUnidadesLineas(ticket?.lineas),
    [ticket?.lineas]
  )

  const {
    handleLiberarMesa,
    handleAddLinea,
    handleRestarUnidadGrupo,
    handleCobrar,
    iniciarDivision,
    handleAnadirPagoDivision,
    handleEliminarPagoDivision,
    handleCompletarDivision,
    rellenarPendiente,
    handleDividirRestanteEnPartes,
    handleConfirmarPartesPagos,
  } = useTpvTicketHandlers({
    mesaId,
    ticket,
    setTicket,
    setError,
    navigate,
    metodoPago,
    setCobrarLoading,
    setActionLoading,
    setBorradorPartesPagos,
    setLiberarMesaLoading,
    setTpvReloadKey,
    importePago,
    metodoPagoDivision,
    setLoadingPago,
    setDivisionError,
    setImportePago,
    setModoDivision,
    loadPagosDivision,
    numPartesInput,
    pendienteDivision,
    borradorPartesPagos,
  })

  const lineas = ticket?.lineas || []

  return {
    mesaId, navigate, carta, categActiva, setCategActiva, ticket, loading,
    error, metodoPago, setMetodoPago, activeTab, setActiveTab, actionLoading,
    cobrarLoading, modoDivision, setModoDivision, pagosRegistrados,
    importePago, setImportePago, metodoPagoDivision, setMetodoPagoDivision,
    loadingPago, divisionError, setDivisionError, numPartesInput, setNumPartesInput,
    borradorPartesPagos, setBorradorPartesPagos, liberarMesaLoading,
    productoNombrePorId, categorias, productosActivos,
    totalPagado, pendienteDivision, handleAddLinea, lineasAgrupadas,
    totalUnidadesComanda, handleRestarUnidadGrupo, handleCobrar,
    iniciarDivision, handleAnadirPagoDivision, handleEliminarPagoDivision,
    handleCompletarDivision, rellenarPendiente, handleDividirRestanteEnPartes,
    handleConfirmarPartesPagos, lineas, handleLiberarMesa,
  }
}
