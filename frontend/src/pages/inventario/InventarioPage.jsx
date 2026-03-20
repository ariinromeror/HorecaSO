import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronDown,
  ClipboardList,
  Edit,
  Filter,
  Package,
  Plus,
  Search,
  Thermometer,
  X,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import {
  createArticulo,
  createMovimiento,
  getArticulos,
  getMovimientos,
  getStockAlertas,
  guardarInventarioFisico,
  updateArticulo,
} from '../../services/api'

const INPUT =
  'w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const CARD_BASE =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl'
const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
const BTN_SECONDARY =
  'h-10 px-4 rounded-lg bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] text-[#111827] dark:text-[#e8eaf0] font-medium transition-colors inline-flex items-center justify-center gap-2'
const BTN_DANGER =
  'h-10 px-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 font-medium transition-colors inline-flex items-center justify-center gap-2'

const CATEGORIAS_ALMACEN = [
  { value: '', label: 'Todas' },
  { value: 'carnes', label: 'Carnes' },
  { value: 'pescados', label: 'Pescados' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'lácteos', label: 'Lácteos' },
  { value: 'verduras', label: 'Verduras' },
  { value: 'secos', label: 'Secos' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'otros', label: 'Otros' },
]

const CATEGORIAS_FORM = CATEGORIAS_ALMACEN.filter((c) => c.value !== '')

const UNIDADES = ['kg', 'g', 'l', 'ml', 'ud']

const TEMP_OPTS = [
  { value: 'ambiente', label: 'Ambiente' },
  { value: 'refrigerado', label: 'Refrigerado' },
  { value: 'congelado', label: 'Congelado' },
]

const TIPOS_MOV_FILTRO = [
  { value: '', label: 'Todos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'merma', label: 'Merma' },
  { value: 'ajuste', label: 'Ajuste' },
]

const TIPOS_MOV_MODAL = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'merma', label: 'Merma' },
  { value: 'ajuste', label: 'Ajuste' },
]

const ICON_PROPS = { strokeWidth: 1.5, className: 'shrink-0' }

function formatEuro(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(n))
}

function formatStock(n, unidad) {
  const x = Number(n)
  const s = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(x)
  return `${s} ${unidad || ''}`.trim()
}

function tempBadgeClass(t) {
  if (t === 'refrigerado')
    return 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
  if (t === 'congelado')
    return 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
  return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
}

function tipoMovBadgeClass(tipo) {
  switch (tipo) {
    case 'entrada':
      return 'bg-emerald-500/10 text-emerald-500'
    case 'salida':
      return 'bg-red-500/10 text-red-500'
    case 'merma':
      return 'bg-orange-500/10 text-orange-500'
    case 'ajuste':
      return 'bg-blue-500/10 text-blue-500'
    default:
      return 'bg-zinc-500/10 text-zinc-400'
  }
}

function cantidadMovDisplay(row) {
  const u = row.unidad_medida || ''
  const c = Number(row.cantidad)
  const abs = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Math.abs(c))
  const suf = u ? ` ${u}` : ''
  if (row.tipo === 'entrada' || row.tipo === 'ajuste') {
    return { text: `+${abs}${suf}`, className: 'text-emerald-500 font-medium' }
  }
  return { text: `-${abs}${suf}`, className: 'text-red-500 font-medium' }
}

/** Movimientos list may not include unidad — join from articulosOpciones */
function enrichMovimiento(m, articulosById) {
  const art = articulosById[m.articulo_id]
  return { ...m, unidad_medida: art?.unidad_medida || '' }
}

function differsStock(inputVal, stockActual) {
  const a = Number(inputVal)
  const b = Number(stockActual)
  if (Number.isNaN(a)) return false
  return Math.abs(a - b) > 1e-6
}

const emptyFormArticulo = () => ({
  nombre: '',
  sku: '',
  unidad_medida: 'kg',
  stock_minimo: '0.01',
  stock_maximo: '',
  coste_unitario: '',
  categoria_almacen: 'otros',
  temperatura_almacen: 'ambiente',
})

export default function InventarioPage() {
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

  const [formArticulo, setFormArticulo] = useState(emptyFormArticulo)
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

  const loadAlertas = useCallback(async () => {
    try {
      const r = await getStockAlertas()
      setAlertas(Array.isArray(r.data) ? r.data : [])
    } catch {
      setAlertas([])
    }
  }, [])

  const loadArticulos = useCallback(async () => {
    setLoadingArticulos(true)
    try {
      const params = {}
      if (buscarDebounced.trim()) params.buscar = buscarDebounced.trim()
      if (categoriaFiltro) params.categoria = categoriaFiltro
      if (soloAlertas) params.alerta = true
      const r = await getArticulos(params)
      setArticulos(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setArticulos([])
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar artículos',
        type: 'error',
      })
    } finally {
      setLoadingArticulos(false)
    }
  }, [buscarDebounced, categoriaFiltro, soloAlertas])

  const loadArticulosOpciones = useCallback(async () => {
    try {
      const r = await getArticulos({})
      setArticulosOpciones(Array.isArray(r.data) ? r.data : [])
    } catch {
      setArticulosOpciones([])
    }
  }, [])

  const loadMovimientos = useCallback(async (params = {}) => {
    setLoadingMovimientos(true)
    try {
      const q = { ...params }
      if (q.articulo_id === '') delete q.articulo_id
      if (q.tipo === '') delete q.tipo
      if (!q.desde) delete q.desde
      if (!q.hasta) delete q.hasta
      const r = await getMovimientos(q)
      setMovimientos(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setMovimientos([])
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar movimientos',
        type: 'error',
      })
    } finally {
      setLoadingMovimientos(false)
    }
  }, [])

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

  const openNuevoArticulo = () => {
    setFormArticulo(emptyFormArticulo())
    setModalArticulo('new')
  }

  const openEditarArticulo = (a) => {
    setFormArticulo({
      nombre: a.nombre || '',
      sku: a.sku || '',
      unidad_medida: a.unidad_medida || 'kg',
      stock_minimo: String(a.stock_minimo ?? '0'),
      stock_maximo:
        a.stock_maximo != null ? String(a.stock_maximo) : '',
      coste_unitario:
        a.coste_unitario != null ? String(a.coste_unitario) : '',
      categoria_almacen: a.categoria_almacen || 'otros',
      temperatura_almacen: a.temperatura_almacen || 'ambiente',
    })
    setModalArticulo(a)
  }

  const submitArticulo = async () => {
    if (!formArticulo.nombre.trim()) {
      setFeedback({ msg: 'El nombre es obligatorio', type: 'error' })
      return
    }
    const body = {
      nombre: formArticulo.nombre.trim(),
      sku: formArticulo.sku.trim() || null,
      unidad_medida: formArticulo.unidad_medida,
      stock_minimo: Number(formArticulo.stock_minimo) || 0,
      stock_maximo: formArticulo.stock_maximo.trim()
        ? Number(formArticulo.stock_maximo)
        : null,
      coste_unitario: formArticulo.coste_unitario.trim()
        ? Number(formArticulo.coste_unitario)
        : null,
      categoria_almacen: formArticulo.categoria_almacen || null,
      temperatura_almacen: formArticulo.temperatura_almacen || null,
    }

    setSavingArticulo(true)
    try {
      if (modalArticulo && modalArticulo !== 'new') {
        const payload = {
          nombre: body.nombre,
          sku: body.sku,
          unidad_medida: body.unidad_medida,
          stock_minimo: body.stock_minimo,
          stock_maximo:
            formArticulo.stock_maximo.trim() === ''
              ? null
              : body.stock_maximo,
          coste_unitario:
            formArticulo.coste_unitario.trim() === ''
              ? null
              : body.coste_unitario,
          categoria_almacen: body.categoria_almacen,
          temperatura_almacen: body.temperatura_almacen,
        }
        await updateArticulo(modalArticulo.id, payload)
        setFeedback({ msg: 'Artículo actualizado', type: 'ok' })
      } else {
        await createArticulo(body)
        setFeedback({ msg: 'Artículo creado', type: 'ok' })
      }
      setModalArticulo(null)
      await loadArticulos()
      await loadArticulosOpciones()
      await loadAlertas()
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al guardar',
        type: 'error',
      })
    } finally {
      setSavingArticulo(false)
    }
  }

  const openMovimiento = (articulo, tipoPref) => {
    setFormMovimiento({
      articulo_id: articulo.id,
      tipo: tipoPref,
      cantidad: '',
      motivo: '',
      coste_unitario: '',
    })
    setModalMovimiento({ articulo, tipo: tipoPref })
  }

  const submitMovimiento = async () => {
    const cant = Number(formMovimiento.cantidad)
    if (!formMovimiento.articulo_id || Number.isNaN(cant) || cant <= 0) {
      setFeedback({ msg: 'Indica una cantidad válida', type: 'error' })
      return
    }
    const body = {
      articulo_id: formMovimiento.articulo_id,
      tipo: formMovimiento.tipo,
      cantidad: cant,
      motivo: formMovimiento.motivo.trim() || null,
      coste_unitario:
        formMovimiento.tipo === 'entrada' &&
        formMovimiento.coste_unitario.trim()
          ? Number(formMovimiento.coste_unitario)
          : null,
    }

    setSavingMovimiento(true)
    try {
      await createMovimiento(body)
      setFeedback({ msg: 'Movimiento registrado', type: 'ok' })
      setModalMovimiento(false)
      await loadArticulos()
      await loadArticulosOpciones()
      await loadAlertas()
      if (tab === 'movimientos') await loadMovimientos({})
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al registrar movimiento',
        type: 'error',
      })
    } finally {
      setSavingMovimiento(false)
    }
  }

  const openInventarioFisico = () => {
    const init = {}
    for (const a of articulosOpciones) {
      init[a.id] = String(
        a.stock_actual != null ? a.stock_actual : '0'
      )
    }
    setInventarioFisicoData(init)
    setModalInventarioFisico(true)
  }

  const countInventarioCambios = useMemo(() => {
    let n = 0
    for (const a of articulosOpciones) {
      const v = inventarioFisicoData[a.id]
      if (v !== undefined && differsStock(v, a.stock_actual)) n += 1
    }
    return n
  }, [inventarioFisicoData, articulosOpciones])

  const submitInventarioFisico = async () => {
    const articulosPayload = []
    for (const a of articulosOpciones) {
      const raw = inventarioFisicoData[a.id]
      if (raw === undefined) continue
      if (!differsStock(raw, a.stock_actual)) continue
      const cantidad_real = Number(raw)
      if (Number.isNaN(cantidad_real) || cantidad_real < 0) {
        setFeedback({
          msg: `Cantidad inválida para ${a.nombre}`,
          type: 'error',
        })
        return
      }
      articulosPayload.push({ articulo_id: a.id, cantidad_real })
    }
    if (!articulosPayload.length) {
      setFeedback({ msg: 'No hay cambios que guardar', type: 'error' })
      return
    }

    setSavingInventario(true)
    try {
      await guardarInventarioFisico({ articulos: articulosPayload })
      setFeedback({
        msg: `Inventario guardado (${articulosPayload.length} artículos)`,
        type: 'ok',
      })
      setModalInventarioFisico(false)
      await loadArticulos()
      await loadArticulosOpciones()
      await loadAlertas()
      if (tab === 'movimientos') await loadMovimientos({})
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al guardar inventario',
        type: 'error',
      })
    } finally {
      setSavingInventario(false)
    }
  }

  const aplicarFiltrosMovimientos = () => {
    loadMovimientos({
      articulo_id: filtroMovArticulo || undefined,
      tipo: filtroMovTipo || undefined,
      desde: filtroMovDesde || undefined,
      hasta: filtroMovHasta || undefined,
    })
  }

  const verTodosAlertas = () => {
    setTab('articulos')
    setSoloAlertas(true)
    setAlertBannerOpen(true)
  }

  const alertasInline = alertas
    .map(
      (a) =>
        `${a.nombre} (${formatStock(a.stock_actual, a.unidad_medida)}, mínimo ${formatStock(a.stock_minimo, a.unidad_medida)})`
    )
    .join(' · ')

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Package {...ICON_PROPS} className="h-8 w-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#f5f5f5]">
            Inventario
          </h1>
        </div>

        {feedback.msg ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
            role="status"
          >
            {feedback.msg}
          </div>
        ) : null}

        {alertas.length > 0 ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 gap-3">
                <AlertTriangle
                  {...ICON_PROPS}
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    {alertas.length} artículo
                    {alertas.length !== 1 ? 's' : ''} por debajo del stock
                    mínimo
                  </p>
                  {alertBannerOpen ? (
                    <p className="mt-2 text-sm text-[#374151] dark:text-[#9ca3af] break-words">
                      {alertasInline}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={verTodosAlertas}
                  className={BTN_SECONDARY}
                >
                  Ver todos
                </button>
                <button
                  type="button"
                  onClick={() => setAlertBannerOpen((o) => !o)}
                  className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
                  aria-expanded={alertBannerOpen}
                  aria-label={
                    alertBannerOpen ? 'Colapsar alertas' : 'Expandir alertas'
                  }
                >
                  <ChevronDown
                    {...ICON_PROPS}
                    className={`h-5 w-5 transition-transform ${alertBannerOpen ? '' : '-rotate-90'}`}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-1 border-b border-[#e2e5ed] dark:border-[#2e3347]">
          <button
            type="button"
            onClick={() => setTab('articulos')}
            className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
              tab === 'articulos'
                ? 'text-amber-500'
                : 'text-[#6b7280] dark:text-[#9ca3af]'
            }`}
          >
            Artículos
            {tab === 'articulos' ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('movimientos')}
            className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
              tab === 'movimientos'
                ? 'text-amber-500'
                : 'text-[#6b7280] dark:text-[#9ca3af]'
            }`}
          >
            Movimientos
            {tab === 'movimientos' ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            ) : null}
          </button>
        </div>

        {tab === 'articulos' ? (
          <section className="space-y-4">
            <div
              className={`flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center ${CARD_BASE}`}
            >
              <div className="relative min-w-[200px] flex-1">
                <Search
                  {...ICON_PROPS}
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]"
                />
                <input
                  type="search"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Buscar artículo..."
                  className={`${INPUT} pl-11`}
                />
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className={`${INPUT} md:max-w-[200px]`}
              >
                {CATEGORIAS_ALMACEN.map((c) => (
                  <option key={c.value || 'all'} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSoloAlertas((s) => !s)}
                className={`${BTN_SECONDARY} ${soloAlertas ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400' : ''}`}
              >
                <Filter {...ICON_PROPS} className="h-4 w-4" />
                Solo alertas
              </button>
              {canEditArticulo ? (
                <>
                  <button
                    type="button"
                    onClick={openNuevoArticulo}
                    className={BTN_PRIMARY}
                  >
                    <Plus {...ICON_PROPS} className="h-5 w-5" />
                    Nuevo artículo
                  </button>
                  <button
                    type="button"
                    onClick={openInventarioFisico}
                    className={BTN_SECONDARY}
                  >
                    <ClipboardList {...ICON_PROPS} className="h-4 w-4" />
                    Inventario físico
                  </button>
                </>
              ) : null}
            </div>

            {loadingArticulos ? (
              <Loader />
            ) : articulos.length === 0 ? (
              <EmptyState message="No hay artículos con estos filtros." />
            ) : (
              <>
                <div className={`hidden overflow-x-auto md:block ${CARD_BASE}`}>
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347] text-[#6b7280] dark:text-[#9ca3af]">
                        <th className="px-4 py-3 font-medium">Nombre</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium">Unidad</th>
                        <th className="px-4 py-3 font-medium">Stock actual</th>
                        <th className="px-4 py-3 font-medium">Mín</th>
                        <th className="px-4 py-3 font-medium">Coste/u</th>
                        <th className="px-4 py-3 font-medium">Categoría</th>
                        <th className="px-4 py-3 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Thermometer
                              {...ICON_PROPS}
                              className="h-4 w-4"
                            />
                            Temp
                          </span>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {articulos.map((a) => (
                        <tr
                          key={a.id}
                          className={`border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80 ${
                            a.alerta_stock
                              ? 'bg-red-500/5'
                              : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                            {a.nombre}
                          </td>
                          <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                            {a.sku || '—'}
                          </td>
                          <td className="px-4 py-3">{a.unidad_medida}</td>
                          <td
                            className={`px-4 py-3 font-medium ${
                              a.alerta_stock
                                ? 'text-red-500'
                                : 'text-[#111827] dark:text-[#e8eaf0]'
                            }`}
                          >
                            {formatStock(a.stock_actual, a.unidad_medida)}
                          </td>
                          <td className="px-4 py-3">
                            {formatStock(a.stock_minimo, a.unidad_medida)}
                          </td>
                          <td className="px-4 py-3">{formatEuro(a.coste_unitario)}</td>
                          <td className="px-4 py-3 capitalize">
                            {a.categoria_almacen || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tempBadgeClass(
                                a.temperatura_almacen || 'ambiente'
                              )}`}
                            >
                              {a.temperatura_almacen || 'ambiente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canEditArticulo ? (
                                <button
                                  type="button"
                                  onClick={() => openEditarArticulo(a)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                                >
                                  <Edit {...ICON_PROPS} className="h-3.5 w-3.5" />
                                  Editar
                                </button>
                              ) : null}
                              {canMovimiento ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openMovimiento(a, 'entrada')
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                                  >
                                    <ArrowDownCircle
                                      {...ICON_PROPS}
                                      className="h-3.5 w-3.5"
                                    />
                                    Entrada
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openMovimiento(a, 'salida')
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
                                  >
                                    <ArrowUpCircle
                                      {...ICON_PROPS}
                                      className="h-3.5 w-3.5"
                                    />
                                    Salida
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {articulos.map((a) => (
                    <div
                      key={a.id}
                      className={`p-4 ${CARD_BASE} ${
                        a.alerta_stock ? 'ring-1 ring-red-500/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                            {a.nombre}
                          </p>
                          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                            SKU: {a.sku || '—'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tempBadgeClass(
                            a.temperatura_almacen || 'ambiente'
                          )}`}
                        >
                          {a.temperatura_almacen || 'ambiente'}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                            Stock
                          </dt>
                          <dd
                            className={
                              a.alerta_stock
                                ? 'font-semibold text-red-500'
                                : 'font-medium text-[#111827] dark:text-[#e8eaf0]'
                            }
                          >
                            {formatStock(a.stock_actual, a.unidad_medida)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                            Mínimo
                          </dt>
                          <dd className="font-medium">
                            {formatStock(a.stock_minimo, a.unidad_medida)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                            Coste/u
                          </dt>
                          <dd>{formatEuro(a.coste_unitario)}</dd>
                        </div>
                        <div>
                          <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                            Categoría
                          </dt>
                          <dd className="capitalize">
                            {a.categoria_almacen || '—'}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e2e5ed] dark:border-[#2e3347] pt-3">
                        {canEditArticulo ? (
                          <button
                            type="button"
                            onClick={() => openEditarArticulo(a)}
                            className={BTN_SECONDARY}
                          >
                            <Edit {...ICON_PROPS} className="h-4 w-4" />
                            Editar
                          </button>
                        ) : null}
                        {canMovimiento ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openMovimiento(a, 'entrada')}
                              className={`${BTN_SECONDARY} text-emerald-600 dark:text-emerald-400`}
                            >
                              <ArrowDownCircle
                                {...ICON_PROPS}
                                className="h-4 w-4"
                              />
                              Entrada
                            </button>
                            <button
                              type="button"
                              onClick={() => openMovimiento(a, 'salida')}
                              className={BTN_DANGER}
                            >
                              <ArrowUpCircle
                                {...ICON_PROPS}
                                className="h-4 w-4"
                              />
                              Salida
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div
              className={`grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 ${CARD_BASE}`}
            >
              <select
                value={filtroMovArticulo}
                onChange={(e) => setFiltroMovArticulo(e.target.value)}
                className={INPUT}
              >
                <option value="">Todos los artículos</option>
                {articulosOpciones.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              <select
                value={filtroMovTipo}
                onChange={(e) => setFiltroMovTipo(e.target.value)}
                className={INPUT}
              >
                {TIPOS_MOV_FILTRO.map((t) => (
                  <option key={t.value || 'all'} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={filtroMovDesde}
                onChange={(e) => setFiltroMovDesde(e.target.value)}
                className={INPUT}
              />
              <input
                type="date"
                value={filtroMovHasta}
                onChange={(e) => setFiltroMovHasta(e.target.value)}
                className={INPUT}
              />
              <button
                type="button"
                onClick={aplicarFiltrosMovimientos}
                className={`${BTN_PRIMARY} w-full sm:col-span-2 lg:col-span-1`}
              >
                Filtrar
              </button>
            </div>

            {loadingMovimientos ? (
              <Loader />
            ) : movimientosEnriquecidos.length === 0 ? (
              <EmptyState message="No hay movimientos." />
            ) : (
              <>
                <div className={`hidden overflow-x-auto md:block ${CARD_BASE}`}>
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347] text-[#6b7280] dark:text-[#9ca3af]">
                        <th className="px-4 py-3 font-medium">Fecha</th>
                        <th className="px-4 py-3 font-medium">Artículo</th>
                        <th className="px-4 py-3 font-medium">Tipo</th>
                        <th className="px-4 py-3 font-medium">Cantidad</th>
                        <th className="px-4 py-3 font-medium">Coste/u</th>
                        <th className="px-4 py-3 font-medium">Motivo</th>
                        <th className="px-4 py-3 font-medium">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosEnriquecidos.map((m) => {
                        const q = cantidadMovDisplay(m)
                        const fecha = m.created_at
                          ? new Date(m.created_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'
                        return (
                          <tr
                            key={m.id}
                            className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                          >
                            <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                              {fecha}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                              {m.articulo_nombre}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tipoMovBadgeClass(
                                  m.tipo
                                )}`}
                              >
                                {m.tipo}
                              </span>
                            </td>
                            <td className={`px-4 py-3 ${q.className}`}>
                              {q.text}
                            </td>
                            <td className="px-4 py-3">
                              {formatEuro(m.coste_unitario)}
                            </td>
                            <td className="max-w-[200px] truncate px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                              {m.motivo || '—'}
                            </td>
                            <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                              {m.usuario_nombre || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {movimientosEnriquecidos.map((m) => {
                    const q = cantidadMovDisplay(m)
                    const fecha = m.created_at
                      ? new Date(m.created_at).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '—'
                    return (
                      <div key={m.id} className={`p-4 ${CARD_BASE}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                              {m.articulo_nombre}
                            </p>
                            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                              {fecha}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tipoMovBadgeClass(
                              m.tipo
                            )}`}
                          >
                            {m.tipo}
                          </span>
                        </div>
                        <p className={`mt-2 text-sm ${q.className}`}>{q.text}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                              Coste/u
                            </dt>
                            <dd>{formatEuro(m.coste_unitario)}</dd>
                          </div>
                          <div>
                            <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                              Usuario
                            </dt>
                            <dd>{m.usuario_nombre || '—'}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                              Motivo
                            </dt>
                            <dd>{m.motivo || '—'}</dd>
                          </div>
                        </dl>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {modalArticulo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 ${CARD_BASE}`}
            role="dialog"
            aria-labelledby="modal-articulo-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="modal-articulo-title"
                className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
              >
                {modalArticulo === 'new' ? 'Nuevo artículo' : 'Editar artículo'}
              </h2>
              <button
                type="button"
                onClick={() => setModalArticulo(null)}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X {...ICON_PROPS} className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Nombre *
                </label>
                <input
                  value={formArticulo.nombre}
                  onChange={(e) =>
                    setFormArticulo((f) => ({ ...f, nombre: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  SKU
                </label>
                <input
                  value={formArticulo.sku}
                  onChange={(e) =>
                    setFormArticulo((f) => ({ ...f, sku: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Unidad *
                </label>
                <select
                  value={formArticulo.unidad_medida}
                  onChange={(e) =>
                    setFormArticulo((f) => ({
                      ...f,
                      unidad_medida: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formArticulo.stock_minimo}
                    onChange={(e) =>
                      setFormArticulo((f) => ({
                        ...f,
                        stock_minimo: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                    Stock máximo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formArticulo.stock_maximo}
                    onChange={(e) =>
                      setFormArticulo((f) => ({
                        ...f,
                        stock_maximo: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Coste unitario
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formArticulo.coste_unitario}
                  onChange={(e) =>
                    setFormArticulo((f) => ({
                      ...f,
                      coste_unitario: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Categoría almacén
                </label>
                <select
                  value={formArticulo.categoria_almacen}
                  onChange={(e) =>
                    setFormArticulo((f) => ({
                      ...f,
                      categoria_almacen: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {CATEGORIAS_FORM.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Temperatura
                </label>
                <select
                  value={formArticulo.temperatura_almacen}
                  onChange={(e) =>
                    setFormArticulo((f) => ({
                      ...f,
                      temperatura_almacen: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {TEMP_OPTS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalArticulo(null)}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitArticulo}
                disabled={savingArticulo}
                className={BTN_PRIMARY}
              >
                <Check {...ICON_PROPS} className="h-5 w-5" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMovimiento ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`max-h-[90vh] w-full max-w-md overflow-y-auto p-6 ${CARD_BASE}`}
            role="dialog"
            aria-labelledby="modal-mov-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="modal-mov-title"
                className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
              >
                Movimiento de stock
              </h2>
              <button
                type="button"
                onClick={() => setModalMovimiento(false)}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X {...ICON_PROPS} className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
              Artículo:{' '}
              <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                {modalMovimiento.articulo.nombre}
              </span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Tipo
                </label>
                <select
                  value={formMovimiento.tipo}
                  onChange={(e) =>
                    setFormMovimiento((f) => ({ ...f, tipo: e.target.value }))
                  }
                  className={INPUT}
                >
                  {TIPOS_MOV_MODAL.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Cantidad *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formMovimiento.cantidad}
                  onChange={(e) =>
                    setFormMovimiento((f) => ({
                      ...f,
                      cantidad: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Motivo
                </label>
                <input
                  value={formMovimiento.motivo}
                  onChange={(e) =>
                    setFormMovimiento((f) => ({ ...f, motivo: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              {formMovimiento.tipo === 'entrada' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                    Actualizar coste unitario (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formMovimiento.coste_unitario}
                    onChange={(e) =>
                      setFormMovimiento((f) => ({
                        ...f,
                        coste_unitario: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalMovimiento(false)}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitMovimiento}
                disabled={savingMovimiento}
                className={BTN_PRIMARY}
              >
                <Check {...ICON_PROPS} className="h-5 w-5" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalInventarioFisico ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 ${CARD_BASE}`}
            role="dialog"
            aria-labelledby="modal-inv-title"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2
                id="modal-inv-title"
                className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
              >
                Inventario físico
              </h2>
              <button
                type="button"
                onClick={() => setModalInventarioFisico(false)}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X {...ICON_PROPS} className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
              Se ajustarán{' '}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {countInventarioCambios}
              </span>{' '}
              artículo{countInventarioCambios !== 1 ? 's' : ''}
            </p>
            <div className="max-h-[50vh] overflow-auto rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="sticky top-0 bg-[#f0f2f5] dark:bg-[#222536]">
                  <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Unidad</th>
                    <th className="px-3 py-2 font-medium">Stock sistema</th>
                    <th className="px-3 py-2 font-medium">Cantidad real</th>
                  </tr>
                </thead>
                <tbody>
                  {articulosOpciones.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                    >
                      <td className="px-3 py-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {a.nombre}
                      </td>
                      <td className="px-3 py-2">{a.unidad_medida}</td>
                      <td className="px-3 py-2">
                        {formatStock(a.stock_actual, a.unidad_medida)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inventarioFisicoData[a.id] ?? ''}
                          onChange={(e) =>
                            setInventarioFisicoData((d) => ({
                              ...d,
                              [a.id]: e.target.value,
                            }))
                          }
                          className={`${INPUT} py-2 text-sm`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {articulosOpciones.length === 0 ? (
              <p className="mt-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                No hay artículos. Carga la página de nuevo.
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalInventarioFisico(false)}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitInventarioFisico}
                disabled={
                  savingInventario ||
                  countInventarioCambios === 0 ||
                  articulosOpciones.length === 0
                }
                className={BTN_PRIMARY}
              >
                <Check {...ICON_PROPS} className="h-5 w-5" />
                Guardar inventario
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
