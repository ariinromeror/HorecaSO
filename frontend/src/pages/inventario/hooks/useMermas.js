import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  createMovimiento,
  getArticulos,
  getMovimientos,
} from '../../../services/api'
import {
  costeLinea,
  firstDayOfMonthISO,
  isSameLocalDay,
  todayISO,
} from '../mermasConstants'

export function useMermas() {
  const { user } = useAuth()
  const rol = user?.rol
  const canRegistrarMerma = ['admin', 'director', 'almacen'].includes(rol)

  const [movimientos, setMovimientos] = useState([])
  const [articulos, setArticulos] = useState([])
  const [loadingMovimientos, setLoadingMovimientos] = useState(true)
  const [loadingArticulos, setLoadingArticulos] = useState(true)

  const [filtros, setFiltros] = useState({
    desde: firstDayOfMonthISO(),
    hasta: todayISO(),
    articulo_id: '',
  })
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    desde: firstDayOfMonthISO(),
    hasta: todayISO(),
    articulo_id: '',
  })

  const [modalMerma, setModalMerma] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null)
  const [buscarArticulo, setBuscarArticulo] = useState('')
  const [listaAbierta, setListaAbierta] = useState(false)
  const [formMerma, setFormMerma] = useState({
    articulo_id: '',
    cantidad: '',
    motivo: 'caducidad',
    motivo_detalle: '',
    coste_unitario: '',
  })
  const [cantidadError, setCantidadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ msg: '', type: '' })
  const comboArticuloRef = useRef(null)

  const loadArticulos = useCallback(async () => {
    setLoadingArticulos(true)
    try {
      const r = await getArticulos({})
      setArticulos(Array.isArray(r.data) ? r.data : [])
    } catch {
      setArticulos([])
    } finally {
      setLoadingArticulos(false)
    }
  }, [])

  const fetchMovimientos = useCallback(async (f) => {
    setLoadingMovimientos(true)
    try {
      const params = {
        tipo: 'merma',
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
        limit: 100,
      }
      if (f.articulo_id) params.articulo_id = f.articulo_id
      const r = await getMovimientos(params)
      const rows = Array.isArray(r.data) ? r.data : []
      const sorted = [...rows].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime()
        const tb = new Date(b.created_at || 0).getTime()
        return tb - ta
      })
      setMovimientos(sorted)
    } catch (e) {
      setMovimientos([])
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar mermas',
        type: 'error',
      })
    } finally {
      setLoadingMovimientos(false)
    }
  }, [])

  useEffect(() => {
    loadArticulos()
  }, [loadArticulos])

  useEffect(() => {
    fetchMovimientos(filtrosAplicados)
  }, [fetchMovimientos, filtrosAplicados])

  useEffect(() => {
    if (!feedback.msg) return
    const t = setTimeout(() => setFeedback({ msg: '', type: '' }), 3000)
    return () => clearTimeout(t)
  }, [feedback.msg])

  useEffect(() => {
    if (!modalMerma || !listaAbierta) return
    const onDoc = (e) => {
      if (
        comboArticuloRef.current &&
        !comboArticuloRef.current.contains(e.target)
      ) {
        setListaAbierta(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [modalMerma, listaAbierta])

  const articulosFiltrados = useMemo(() => {
    const q = buscarArticulo.trim().toLowerCase()
    if (!q) return articulos
    return articulos.filter(
      (a) =>
        (a.nombre && a.nombre.toLowerCase().includes(q)) ||
        (a.sku && String(a.sku).toLowerCase().includes(q))
    )
  }, [articulos, buscarArticulo])

  const resumen = useMemo(() => {
    const today = new Date()
    const mermasHoy = movimientos.filter((m) =>
      isSameLocalDay(m.created_at, today)
    )
    const costeHoy = mermasHoy.reduce((acc, m) => {
      const c = costeLinea(m.cantidad, m.coste_unitario)
      return acc + (c != null ? c : 0)
    }, 0)
    const totalPeriodo = movimientos.length
    const costePeriodo = movimientos.reduce((acc, m) => {
      const c = costeLinea(m.cantidad, m.coste_unitario)
      return acc + (c != null ? c : 0)
    }, 0)
    return {
      mermasHoy: mermasHoy.length,
      costeHoy,
      totalPeriodo,
      costePeriodo,
    }
  }, [movimientos])

  const aplicarFiltros = () => {
    setFiltrosAplicados({ ...filtros })
  }

  const openModal = () => {
    setFormMerma({
      articulo_id: '',
      cantidad: '',
      motivo: 'caducidad',
      motivo_detalle: '',
      coste_unitario: '',
    })
    setArticuloSeleccionado(null)
    setBuscarArticulo('')
    setCantidadError('')
    setListaAbierta(false)
    setModalMerma(true)
  }

  const seleccionarArticulo = (a) => {
    setArticuloSeleccionado(a)
    setFormMerma((f) => ({
      ...f,
      articulo_id: a.id,
      coste_unitario:
        a.coste_unitario != null ? String(a.coste_unitario) : '',
    }))
    setBuscarArticulo(a.nombre || '')
    setListaAbierta(false)
    setCantidadError('')
  }

  const validarCantidad = (cantStr, art) => {
    if (!art) {
      setCantidadError('')
      return true
    }
    const c = Number(cantStr)
    if (Number.isNaN(c) || c <= 0) {
      setCantidadError('')
      return false
    }
    const stock = Number(art.stock_actual) || 0
    if (c > stock) {
      setCantidadError(`La cantidad no puede superar el stock (${stock})`)
      return false
    }
    setCantidadError('')
    return true
  }

  const construirMotivoBackend = () => {
    const base = formMerma.motivo
    const det = formMerma.motivo_detalle.trim()
    if (det) return `${base}: ${det}`
    return base
  }

  const submitMerma = async () => {
    if (!formMerma.articulo_id || !articuloSeleccionado) {
      setFeedback({ msg: 'Selecciona un artículo', type: 'error' })
      return
    }
    const cant = Number(formMerma.cantidad)
    if (Number.isNaN(cant) || cant <= 0) {
      setFeedback({ msg: 'Indica una cantidad válida', type: 'error' })
      return
    }
    if (!validarCantidad(formMerma.cantidad, articuloSeleccionado)) {
      return
    }

    let costeEnvio = null
    if (formMerma.coste_unitario.trim()) {
      costeEnvio = Number(formMerma.coste_unitario)
    } else if (articuloSeleccionado.coste_unitario != null) {
      costeEnvio = Number(articuloSeleccionado.coste_unitario)
    }

    setSaving(true)
    try {
      await createMovimiento({
        articulo_id: formMerma.articulo_id,
        tipo: 'merma',
        cantidad: cant,
        motivo: construirMotivoBackend(),
        coste_unitario: costeEnvio,
      })
      setFeedback({ msg: 'Merma registrada correctamente', type: 'ok' })
      setModalMerma(false)
      await loadArticulos()
      await fetchMovimientos(filtrosAplicados)
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al registrar la merma',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return {
    canRegistrarMerma,
    movimientos,
    articulos,
    loadingMovimientos,
    loadingArticulos,
    filtros,
    setFiltros,
    aplicarFiltros,
    feedback,
    resumen,
    modalMerma,
    setModalMerma,
    articuloSeleccionado,
    setArticuloSeleccionado,
    buscarArticulo,
    setBuscarArticulo,
    listaAbierta,
    setListaAbierta,
    formMerma,
    setFormMerma,
    cantidadError,
    saving,
    comboArticuloRef,
    articulosFiltrados,
    openModal,
    seleccionarArticulo,
    validarCantidad,
    submitMerma,
  }
}
