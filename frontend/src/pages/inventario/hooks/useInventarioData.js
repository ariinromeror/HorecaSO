import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  differsStock,
  emptyFormArticulo,
  enrichMovimiento,
  formatStock,
} from '../constants'
import { createInventarioHandlers } from './inventarioHandlers'
import { useInventarioLoads } from './useInventarioLoads'

export function useInventarioData() {
  const { user } = useAuth()
  const rol = user?.rol

  const canEditArticulo = ['admin', 'director', 'almacen'].includes(rol)
  const canMovimiento = ['admin', 'director', 'almacen'].includes(rol)

  const [tab, setTab] = useState('articulos')
  const [articulos, setArticulos] = useState([])
  const [articulosOpciones, setArticulosOpciones] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loadingArticulos, setLoadingArticulos] = useState(true)
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [soloAlertas, setSoloAlertas] = useState(false)
  const [alertBannerOpen, setAlertBannerOpen] = useState(true)

  const [modalArticulo, setModalArticulo] = useState(null)
  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [modalInventarioFisico, setModalInventarioFisico] = useState(false)
  const [inventarioFisicoData, setInventarioFisicoData] = useState({})
  const [savingInventario, setSavingInventario] = useState(false)

  const [formArticulo, setFormArticulo] = useState(emptyFormArticulo())
  const [formMovimiento, setFormMovimiento] = useState({
    articulo_id: '',
    tipo: 'entrada',
    cantidad: '',
    motivo: '',
    coste_unitario: '',
  })
  const [savingArticulo, setSavingArticulo] = useState(false)
  const [savingMovimiento, setSavingMovimiento] = useState(false)

  const [filtroMovArticulo, setFiltroMovArticulo] = useState('')
  const [filtroMovTipo, setFiltroMovTipo] = useState('')
  const [filtroMovDesde, setFiltroMovDesde] = useState('')
  const [filtroMovHasta, setFiltroMovHasta] = useState('')

  const [feedback, setFeedback] = useState({ msg: '', type: '' })

  const articulosById = useMemo(() => {
    const m = {}
    for (const a of articulosOpciones) m[a.id] = a
    return m
  }, [articulosOpciones])

  const movimientosEnriquecidos = useMemo(
    () => movimientos.map((row) => enrichMovimiento(row, articulosById)),
    [movimientos, articulosById]
  )

  const {
    loadAlertas,
    loadArticulos,
    loadArticulosOpciones,
    loadMovimientos,
  } = useInventarioLoads({
    buscarDebounced,
    categoriaFiltro,
    soloAlertas,
    setLoadingArticulos,
    setArticulos,
    setFeedback,
    setArticulosOpciones,
    setMovimientos,
    setLoadingMovimientos,
    setAlertas,
  })

  useEffect(() => {
    const t = setTimeout(() => setBuscarDebounced(buscar), 350)
    return () => clearTimeout(t)
  }, [buscar])

  useEffect(() => {
    loadArticulosOpciones()
    loadAlertas()
  }, [loadArticulosOpciones, loadAlertas])

  useEffect(() => {
    loadArticulos()
  }, [loadArticulos])

  useEffect(() => {
    if (tab !== 'movimientos') return
    loadMovimientos({})
  }, [tab, loadMovimientos])

  useEffect(() => {
    if (!feedback.msg) return
    const id = setTimeout(
      () => setFeedback({ msg: '', type: '' }),
      3000
    )
    return () => clearTimeout(id)
  }, [feedback.msg])

  const countInventarioCambios = useMemo(() => {
    let n = 0
    for (const a of articulosOpciones) {
      const v = inventarioFisicoData[a.id]
      if (v !== undefined && differsStock(v, a.stock_actual)) n += 1
    }
    return n
  }, [inventarioFisicoData, articulosOpciones])

  const {
    openNuevoArticulo,
    openEditarArticulo,
    submitArticulo,
    openMovimiento,
    submitMovimiento,
    openInventarioFisico,
    submitInventarioFisico,
    aplicarFiltrosMovimientos,
    verTodosAlertas,
  } = createInventarioHandlers({
    formArticulo,
    modalArticulo,
    setFormArticulo,
    setModalArticulo,
    setFeedback,
    setSavingArticulo,
    setSavingMovimiento,
    setModalMovimiento,
    formMovimiento,
    setFormMovimiento,
    tab,
    articulosOpciones,
    inventarioFisicoData,
    setInventarioFisicoData,
    setModalInventarioFisico,
    setSavingInventario,
    filtroMovArticulo,
    filtroMovTipo,
    filtroMovDesde,
    filtroMovHasta,
    setTab,
    setSoloAlertas,
    setAlertBannerOpen,
    loadArticulos,
    loadArticulosOpciones,
    loadAlertas,
    loadMovimientos,
  })

  const alertasInline = alertas
    .map(
      (a) =>
        `${a.nombre} (${formatStock(a.stock_actual, a.unidad_medida)}, mínimo ${formatStock(a.stock_minimo, a.unidad_medida)})`
    )
    .join(' · ')

  return {
    canEditArticulo,
    canMovimiento,
    tab,
    setTab,
    articulos,
    articulosOpciones,
    movimientosEnriquecidos,
    alertas,
    loadingArticulos,
    loadingMovimientos,
    buscar,
    setBuscar,
    categoriaFiltro,
    setCategoriaFiltro,
    soloAlertas,
    setSoloAlertas,
    alertBannerOpen,
    setAlertBannerOpen,
    modalArticulo,
    setModalArticulo,
    modalMovimiento,
    setModalMovimiento,
    modalInventarioFisico,
    setModalInventarioFisico,
    inventarioFisicoData,
    setInventarioFisicoData,
    savingInventario,
    formArticulo,
    setFormArticulo,
    formMovimiento,
    setFormMovimiento,
    savingArticulo,
    savingMovimiento,
    filtroMovArticulo,
    setFiltroMovArticulo,
    filtroMovTipo,
    setFiltroMovTipo,
    filtroMovDesde,
    setFiltroMovDesde,
    filtroMovHasta,
    setFiltroMovHasta,
    feedback,
    setFeedback,
    openNuevoArticulo,
    openEditarArticulo,
    submitArticulo,
    openMovimiento,
    submitMovimiento,
    openInventarioFisico,
    countInventarioCambios,
    submitInventarioFisico,
    aplicarFiltrosMovimientos,
    verTodosAlertas,
    alertasInline,
    loadArticulos,
    loadArticulosOpciones,
  }
}
