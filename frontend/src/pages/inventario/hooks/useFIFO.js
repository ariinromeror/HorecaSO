import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../services/api'
import {
  emptyConsumir,
  emptyNuevoLote,
  parseApiError,
  ROLES_ACCESO_FIFO,
} from '../fifoConstants'

export function useFIFO() {
  const { user, isLoading: authLoading } = useAuth()
  const puedeAcceder = user && ROLES_ACCESO_FIFO.includes(user.rol)

  const [mainTab, setMainTab] = useState('lotes')

  const [articulos, setArticulos] = useState([])
  const [loadingArticulos, setLoadingArticulos] = useState(false)

  const [filtroArticuloId, setFiltroArticuloId] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [lotes, setLotes] = useState([])
  const [loadingLotes, setLoadingLotes] = useState(false)
  const [errorLotes, setErrorLotes] = useState(null)

  const [modalNuevo, setModalNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState(emptyNuevoLote)
  const [modalNuevoErr, setModalNuevoErr] = useState(null)
  const [savingNuevo, setSavingNuevo] = useState(false)

  const [modalConsumir, setModalConsumir] = useState(false)
  const [formConsumir, setFormConsumir] = useState(emptyConsumir)
  const [modalConsumirErr, setModalConsumirErr] = useState(null)
  const [savingConsumir, setSavingConsumir] = useState(false)

  const [diasAlerta, setDiasAlerta] = useState(7)
  const [alertas, setAlertas] = useState([])
  const [loadingAlertas, setLoadingAlertas] = useState(false)
  const [errorAlertas, setErrorAlertas] = useState(null)
  const [alertasBuscado, setAlertasBuscado] = useState(false)

  const [valoracion, setValoracion] = useState(null)
  const [loadingValoracion, setLoadingValoracion] = useState(false)
  const [errorValoracion, setErrorValoracion] = useState(null)

  const cargarArticulos = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingArticulos(true)
    try {
      const r = await api.get('/inventario/articulos')
      setArticulos(Array.isArray(r.data) ? r.data : [])
    } catch {
      setArticulos([])
    } finally {
      setLoadingArticulos(false)
    }
  }, [puedeAcceder])

  const cargarLotes = useCallback(async () => {
    if (!puedeAcceder || mainTab !== 'lotes') return
    setLoadingLotes(true)
    setErrorLotes(null)
    try {
      const params = {}
      if (filtroArticuloId) params.articulo_id = filtroArticuloId
      if (soloActivos) params.solo_activos = true
      const r = await api.get('/fifo/lotes', { params })
      setLotes(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorLotes(e.response?.data?.detail || 'Error al cargar lotes')
      setLotes([])
    } finally {
      setLoadingLotes(false)
    }
  }, [puedeAcceder, mainTab, filtroArticuloId, soloActivos])

  const buscarAlertas = useCallback(async () => {
    if (!puedeAcceder) return
    setLoadingAlertas(true)
    setErrorAlertas(null)
    setAlertasBuscado(true)
    try {
      const d = Math.min(365, Math.max(1, Number(diasAlerta) || 7))
      const r = await api.get('/fifo/alertas-caducidad', { params: { dias: d } })
      setAlertas(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErrorAlertas(e.response?.data?.detail || 'Error al cargar alertas')
      setAlertas([])
    } finally {
      setLoadingAlertas(false)
    }
  }, [puedeAcceder, diasAlerta])

  const cargarValoracion = useCallback(async () => {
    if (!puedeAcceder || mainTab !== 'valoracion') return
    setLoadingValoracion(true)
    setErrorValoracion(null)
    try {
      const r = await api.get('/fifo/valoracion-stock')
      setValoracion(r.data || null)
    } catch (e) {
      setErrorValoracion(e.response?.data?.detail || 'Error al cargar valoración')
      setValoracion(null)
    } finally {
      setLoadingValoracion(false)
    }
  }, [puedeAcceder, mainTab])

  useEffect(() => {
    if (!puedeAcceder) return
    cargarArticulos()
  }, [puedeAcceder, cargarArticulos])

  useEffect(() => {
    cargarLotes()
  }, [cargarLotes])

  useEffect(() => {
    cargarValoracion()
  }, [cargarValoracion])

  const articuloLabel = useCallback(
    (id) => {
      const a = articulos.find((x) => x.id === id)
      return a ? a.nombre : '—'
    },
    [articulos]
  )

  const totalValoracionTabla = useMemo(() => {
    if (!valoracion?.articulos?.length) return 0
    return valoracion.articulos.reduce((acc, row) => {
      const v = Number(row.valor_total)
      return acc + (Number.isNaN(v) ? 0 : v)
    }, 0)
  }, [valoracion])

  const guardarNuevoLote = async () => {
    if (!formNuevo.articulo_id) {
      setModalNuevoErr('Selecciona un artículo')
      return
    }
    const cant = Number(formNuevo.cantidad)
    if (!Number.isFinite(cant) || cant <= 0) {
      setModalNuevoErr('La cantidad debe ser mayor que 0')
      return
    }
    const coste = Number(formNuevo.coste_unitario)
    if (!Number.isFinite(coste) || coste < 0) {
      setModalNuevoErr('El coste unitario debe ser ≥ 0')
      return
    }
    setSavingNuevo(true)
    setModalNuevoErr(null)
    const body = {
      articulo_id: formNuevo.articulo_id,
      cantidad: cant,
      coste_unitario: coste,
      fecha_caducidad: formNuevo.fecha_caducidad?.trim() || null,
      numero_lote: formNuevo.numero_lote?.trim() || null,
    }
    try {
      await api.post('/fifo/lotes', body)
      setModalNuevo(false)
      setFormNuevo(emptyNuevoLote())
      await cargarArticulos()
      await cargarLotes()
    } catch (e) {
      setModalNuevoErr(parseApiError(e))
    } finally {
      setSavingNuevo(false)
    }
  }

  const ejecutarConsumir = async () => {
    if (!formConsumir.articulo_id) {
      setModalConsumirErr('Selecciona un artículo')
      return
    }
    const cant = Number(formConsumir.cantidad)
    if (!Number.isFinite(cant) || cant <= 0) {
      setModalConsumirErr('La cantidad debe ser mayor que 0')
      return
    }
    const motivo = (formConsumir.motivo || '').trim()
    if (!motivo) {
      setModalConsumirErr('El motivo es obligatorio')
      return
    }
    setSavingConsumir(true)
    setModalConsumirErr(null)
    try {
      await api.post('/fifo/consumir', {
        articulo_id: formConsumir.articulo_id,
        cantidad: cant,
        motivo,
      })
      setModalConsumir(false)
      setFormConsumir(emptyConsumir())
      await cargarArticulos()
      await cargarLotes()
      if (mainTab === 'valoracion') await cargarValoracion()
    } catch (e) {
      setModalConsumirErr(parseApiError(e))
    } finally {
      setSavingConsumir(false)
    }
  }

  return {
    user,
    authLoading,
    puedeAcceder,
    mainTab,
    setMainTab,
    articulos,
    loadingArticulos,
    filtroArticuloId,
    setFiltroArticuloId,
    soloActivos,
    setSoloActivos,
    lotes,
    loadingLotes,
    errorLotes,
    modalNuevo,
    setModalNuevo,
    formNuevo,
    setFormNuevo,
    modalNuevoErr,
    setModalNuevoErr,
    savingNuevo,
    modalConsumir,
    setModalConsumir,
    formConsumir,
    setFormConsumir,
    modalConsumirErr,
    setModalConsumirErr,
    savingConsumir,
    diasAlerta,
    setDiasAlerta,
    alertas,
    loadingAlertas,
    errorAlertas,
    alertasBuscado,
    buscarAlertas,
    valoracion,
    loadingValoracion,
    errorValoracion,
    articuloLabel,
    totalValoracionTabla,
    guardarNuevoLote,
    ejecutarConsumir,
  }
}
