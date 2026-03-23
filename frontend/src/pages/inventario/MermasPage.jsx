import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertTriangle,
  Calendar,
  Filter,
  Package,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import StatCard from '../../components/shared/StatCard'
import { useAuth } from '../../context/AuthContext'
import {
  createMovimiento,
  getArticulos,
  getMovimientos,
} from '../../services/api'

const INPUT =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const TABLE_WRAP =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl overflow-hidden'
const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
const BTN_DANGER =
  'h-12 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'
const BTN_SECONDARY =
  'h-10 px-4 rounded-lg bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] text-[#111827] dark:text-[#e8eaf0] font-medium inline-flex items-center justify-center gap-2'

const ICON = { strokeWidth: 1.5, className: 'shrink-0' }

const MOTIVO_OPTS = [
  { value: 'caducidad', label: 'Caducidad' },
  { value: 'rotura', label: 'Rotura' },
  { value: 'error_cocina', label: 'Error cocina' },
  { value: 'sobrante', label: 'Sobrante' },
  { value: 'otro', label: 'Otro' },
]

function firstDayOfMonthISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameLocalDay(isoString, refDate) {
  if (!isoString) return false
  const dt = new Date(isoString)
  if (Number.isNaN(dt.getTime())) return false
  return (
    dt.getFullYear() === refDate.getFullYear() &&
    dt.getMonth() === refDate.getMonth() &&
    dt.getDate() === refDate.getDate()
  )
}

function formatFechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseMotivoCategoria(motivoStr) {
  if (!motivoStr || typeof motivoStr !== 'string') return 'otro'
  const t = motivoStr.trim()
  const base = t.split(':')[0].trim().toLowerCase()
  const known = ['caducidad', 'rotura', 'error_cocina', 'sobrante', 'otro']
  if (known.includes(base)) return base
  return 'otro'
}

function badgeMotivoClass(cat) {
  switch (cat) {
    case 'caducidad':
      return 'bg-orange-500/10 text-orange-500'
    case 'rotura':
      return 'bg-blue-500/10 text-blue-500'
    case 'error_cocina':
      return 'bg-purple-500/10 text-purple-500'
    case 'sobrante':
      return 'bg-gray-500/10 text-gray-500'
    default:
      return 'bg-gray-500/10 text-gray-500'
  }
}

function labelMotivo(cat) {
  const o = MOTIVO_OPTS.find((x) => x.value === cat)
  return o ? o.label : cat
}

function costeLinea(cantidad, costeUnitario) {
  if (costeUnitario == null || Number.isNaN(Number(costeUnitario))) return null
  return Number(cantidad) * Number(costeUnitario)
}

function formatEuro2(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)
}

export default function MermasPage() {
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

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Trash2
                {...ICON}
                className="h-8 w-8 shrink-0 text-red-500"
              />
              <h1 className="text-2xl font-bold text-[#111827] dark:text-[#f5f5f5]">
                Mermas
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
              Registro de pérdidas y control de desperdicios
            </p>
          </div>
          {canRegistrarMerma ? (
            <button type="button" onClick={openModal} className={BTN_PRIMARY}>
              <Plus {...ICON} className="h-5 w-5" />
              Registrar merma
            </button>
          ) : null}
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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard
            label="Total mermas hoy"
            value={resumen.mermasHoy}
            Icon={Calendar}
            color="white"
          />
          <StatCard
            label="Coste mermas hoy"
            value={formatEuro2(resumen.costeHoy)}
            Icon={TrendingDown}
            color="red"
          />
          <StatCard
            label="Total mermas periodo"
            value={resumen.totalPeriodo}
            Icon={Package}
            color="white"
          />
          <StatCard
            label="Coste total periodo"
            value={formatEuro2(resumen.costePeriodo)}
            Icon={Trash2}
            color="red"
          />
        </div>

        <div
          className={`flex min-w-0 max-w-full flex-col gap-3 overflow-x-auto p-4 sm:flex-row sm:flex-wrap sm:items-end ${TABLE_WRAP}`}
        >
          <div className="min-w-0 flex-1 sm:min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
              Desde
            </label>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, desde: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
              Hasta
            </label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, hasta: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div className="min-w-0 flex-[2] sm:min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
              Artículo
            </label>
            <select
              value={filtros.articulo_id}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, articulo_id: e.target.value }))
              }
              className={INPUT}
              disabled={loadingArticulos}
            >
              <option value="">Todos</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={aplicarFiltros}
            className={`${BTN_PRIMARY} w-full sm:w-auto`}
          >
            <Filter {...ICON} className="h-5 w-5" />
            Filtrar
          </button>
        </div>

        {loadingMovimientos ? (
          <Loader />
        ) : movimientos.length === 0 ? (
          <EmptyState message="No hay mermas en el periodo seleccionado." />
        ) : (
          <>
            <div className={`hidden md:block ${TABLE_WRAP}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-[#e2e5ed] bg-[#f9fafb] dark:border-[#2e3347] dark:bg-[#222536]">
                    <tr className="text-[#6b7280] dark:text-[#9ca3af]">
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Artículo</th>
                      <th className="px-4 py-3 font-medium">Cantidad</th>
                      <th className="px-4 py-3 font-medium">Motivo</th>
                      <th className="px-4 py-3 font-medium">Coste unitario</th>
                      <th className="px-4 py-3 font-medium">Coste total</th>
                      <th className="px-4 py-3 font-medium">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => {
                      const cat = parseMotivoCategoria(m.motivo)
                      const motivoDetalle =
                        m.motivo && m.motivo.includes(':')
                          ? m.motivo.split(':').slice(1).join(':').trim()
                          : ''
                      const cu = m.coste_unitario
                      const ct = costeLinea(m.cantidad, cu)
                      const unidad =
                        articulos.find((x) => x.id === m.articulo_id)
                          ?.unidad_medida || ''
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                        >
                          <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                            {formatFechaHora(m.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                            {m.articulo_nombre}
                          </td>
                          <td className="px-4 py-3 font-medium text-red-500">
                            -
                            {new Intl.NumberFormat('es-ES', {
                              maximumFractionDigits: 4,
                            }).format(Number(m.cantidad))}{' '}
                            {unidad}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${badgeMotivoClass(
                                cat
                              )}`}
                            >
                              {labelMotivo(cat)}
                            </span>
                            {motivoDetalle ? (
                              <p className="mt-1 max-w-[220px] text-xs text-[#6b7280] dark:text-[#9ca3af]">
                                {motivoDetalle}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {cu != null ? formatEuro2(cu) : '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-red-500">
                            {ct != null ? formatEuro2(ct) : '—'}
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
            </div>

            <div className="space-y-3 md:hidden">
              {movimientos.map((m) => {
                const cat = parseMotivoCategoria(m.motivo)
                const cu = m.coste_unitario
                const ct = costeLinea(m.cantidad, cu)
                const unidad =
                  articulos.find((x) => x.id === m.articulo_id)
                    ?.unidad_medida || ''
                const detalleExtra =
                  m.motivo && m.motivo.includes(':')
                    ? m.motivo.split(':').slice(1).join(':').trim()
                    : ''
                return (
                  <div key={m.id} className={`p-4 ${TABLE_WRAP}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                          {m.articulo_nombre}
                        </p>
                        <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                          {formatFechaHora(m.created_at)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${badgeMotivoClass(
                          cat
                        )}`}
                      >
                        {labelMotivo(cat)}
                      </span>
                    </div>
                    {detalleExtra ? (
                      <p className="mt-2 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                        {detalleExtra}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm font-medium text-red-500">
                      -
                      {new Intl.NumberFormat('es-ES', {
                        maximumFractionDigits: 4,
                      }).format(Number(m.cantidad))}{' '}
                      {unidad}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                          Coste u.
                        </dt>
                        <dd>{cu != null ? formatEuro2(cu) : '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                          Coste total
                        </dt>
                        <dd className="font-medium text-red-500">
                          {ct != null ? formatEuro2(ct) : '—'}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                          Usuario
                        </dt>
                        <dd>{m.usuario_nombre || '—'}</dd>
                      </div>
                    </dl>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {modalMerma ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white p-6 dark:border-[#2e3347] dark:bg-[#1a1d27]"
            role="dialog"
            aria-labelledby="merma-modal-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="merma-modal-title"
                className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5]"
              >
                Registrar merma
              </h2>
              <button
                type="button"
                onClick={() => setModalMerma(false)}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X {...ICON} className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative" ref={comboArticuloRef}>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Artículo *
                </label>
                <div className="relative">
                  <Search
                    {...ICON}
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]"
                  />
                  <input
                    type="text"
                    value={buscarArticulo}
                    onChange={(e) => {
                      setBuscarArticulo(e.target.value)
                      setListaAbierta(true)
                      if (!e.target.value.trim()) {
                        setArticuloSeleccionado(null)
                        setFormMerma((f) => ({
                          ...f,
                          articulo_id: '',
                        }))
                      }
                    }}
                    onFocus={() => setListaAbierta(true)}
                    placeholder="Buscar artículo..."
                    className={`${INPUT} pl-11`}
                    autoComplete="off"
                  />
                  {listaAbierta && articulosFiltrados.length > 0 ? (
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[#e2e5ed] bg-white py-1 shadow-lg dark:border-[#2e3347] dark:bg-[#222536]">
                      {articulosFiltrados.slice(0, 50).map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => seleccionarArticulo(a)}
                            className="w-full px-4 py-2 text-left text-sm text-[#111827] hover:bg-[#f0f2f5] dark:text-[#e8eaf0] dark:hover:bg-[#2e3347]"
                          >
                            {a.nombre} — stock actual:{' '}
                            {new Intl.NumberFormat('es-ES', {
                              maximumFractionDigits: 4,
                            }).format(Number(a.stock_actual) || 0)}{' '}
                            {a.unidad_medida}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {articuloSeleccionado ? (
                  <p
                    className={`mt-2 text-xs ${
                      Number(articuloSeleccionado.stock_actual) <=
                      Number(articuloSeleccionado.stock_minimo || 0)
                        ? 'text-amber-500'
                        : 'text-[#6b7280] dark:text-[#9ca3af]'
                    }`}
                  >
                    Stock disponible:{' '}
                    {new Intl.NumberFormat('es-ES', {
                      maximumFractionDigits: 4,
                    }).format(Number(articuloSeleccionado.stock_actual) || 0)}{' '}
                    {articuloSeleccionado.unidad_medida}
                    {Number(articuloSeleccionado.stock_actual) <=
                    Number(articuloSeleccionado.stock_minimo || 0) ? (
                      <span className="ml-1 inline-flex items-center gap-1">
                        <AlertTriangle
                          {...ICON}
                          className="inline h-3.5 w-3.5"
                        />
                        Bajo mínimo
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Cantidad *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formMerma.cantidad}
                  onChange={(e) => {
                    setFormMerma((f) => ({ ...f, cantidad: e.target.value }))
                    if (articuloSeleccionado) {
                      validarCantidad(e.target.value, articuloSeleccionado)
                    }
                  }}
                  className={INPUT}
                />
                {cantidadError ? (
                  <p className="mt-1 text-sm text-red-500">{cantidadError}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Motivo *
                </label>
                <select
                  value={formMerma.motivo}
                  onChange={(e) =>
                    setFormMerma((f) => ({ ...f, motivo: e.target.value }))
                  }
                  className={INPUT}
                >
                  {MOTIVO_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Detalle
                </label>
                <input
                  value={formMerma.motivo_detalle}
                  onChange={(e) =>
                    setFormMerma((f) => ({
                      ...f,
                      motivo_detalle: e.target.value,
                    }))
                  }
                  placeholder="Detalle adicional (opcional)"
                  className={INPUT}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  Coste unitario (€) — dejar vacío para usar el del artículo
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formMerma.coste_unitario}
                  onChange={(e) =>
                    setFormMerma((f) => ({
                      ...f,
                      coste_unitario: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalMerma(false)}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitMerma}
                disabled={
                  saving ||
                  !!cantidadError ||
                  !articuloSeleccionado ||
                  !formMerma.cantidad
                }
                className={BTN_DANGER}
              >
                <Trash2 {...ICON} className="h-5 w-5" />
                Registrar merma
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
