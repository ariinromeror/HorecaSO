import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  Check,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  Plus,
  ScanLine,
  Upload,
  X,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import {
  createFacturaProveedor,
  escanearFacturaIA,
  getArticulos,
  getFacturaProveedor,
  getFacturasPendientes,
  getFacturasProveedor,
  getProveedores,
  pagarFactura,
} from '../../services/api'

const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN_PRIMARY =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
const ROLES_ESCRITURA = ['admin', 'director', 'almacen']

function hoyISO() {
  const d = new Date()
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function formatEuro(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n))
}

function fechaCorta(iso) {
  if (!iso) return '—'
  try {
    const s = String(iso).slice(0, 10)
    const [y, m, d] = s.split('-')
    return d && m && y ? `${d}/${m}/${y}` : iso
  } catch {
    return '—'
  }
}

/** Días hasta vencimiento (negativo = vencida). */
function diasHastaVencimiento(fechaVenc) {
  if (!fechaVenc) return null
  const s = String(fechaVenc).slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  const v = new Date(y, m - 1, d)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  v.setHours(0, 0, 0, 0)
  return Math.round((v - t) / 86400000)
}

function textoVencimiento(f, dias) {
  if (f.pagada) return '—'
  if (dias == null) return fechaCorta(f.fecha_vencimiento) || '—'
  if (dias < 0) {
    return (
      <span className="font-medium text-red-500">
        Vencida hace {Math.abs(dias)} día{Math.abs(dias) === 1 ? '' : 's'}
      </span>
    )
  }
  if (dias <= 7) {
    return (
      <span className="font-medium text-amber-500">
        Vence en {dias} día{dias === 1 ? '' : 's'}
      </span>
    )
  }
  return fechaCorta(f.fecha_vencimiento)
}

function badgeEstadoPago(f, dias) {
  if (f.pagada) {
    return (
      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        Pagada
      </span>
    )
  }
  if (dias != null && dias < 0) {
    return (
      <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
        Vencida
      </span>
    )
  }
  return (
    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      Pendiente
    </span>
  )
}

export default function FacturasPage() {
  const { user } = useAuth()
  const puedeEscribir = ROLES_ESCRITURA.includes(user?.rol)
  const [searchParams, setSearchParams] = useSearchParams()
  const proveedorUrl = searchParams.get('proveedor_id') || ''

  const [tabActiva, setTabActiva] = useState('todas')
  const [facturas, setFacturas] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [proveedores, setProveedores] = useState([])
  const [articulos, setArticulos] = useState([])
  const [modalFactura, setModalFactura] = useState(false)
  const [modalLineas, setModalLineas] = useState(null)
  const [modalIA, setModalIA] = useState(false)
  const [lineasDetalleLoading, setLineasDetalleLoading] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [resultadoIA, setResultadoIA] = useState(null)
  const [filtros, setFiltros] = useState({
    proveedor_id: proveedorUrl,
    pagada: '',
    desde: '',
    hasta: '',
  })
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    setFiltros((f) => ({ ...f, proveedor_id: proveedorUrl }))
  }, [proveedorUrl])

  useEffect(() => {
    if (!feedback?.msg) return
    const t = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(t)
  }, [feedback])

  const cargarProveedoresArticulos = useCallback(async () => {
    try {
      const [pr, ar] = await Promise.all([
        getProveedores({ activo: true }),
        getArticulos({}),
      ])
      setProveedores(Array.isArray(pr.data) ? pr.data : [])
      setArticulos(Array.isArray(ar.data) ? ar.data : [])
    } catch {
      setProveedores([])
      setArticulos([])
    }
  }, [])

  useEffect(() => {
    cargarProveedoresArticulos()
  }, [cargarProveedoresArticulos])

  const cargarFacturas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tabActiva === 'pendientes') {
        const r = await getFacturasPendientes()
        setPendientes(Array.isArray(r.data) ? r.data : [])
        setFacturas([])
      } else {
        const params = {}
        if (filtros.proveedor_id) params.proveedor_id = filtros.proveedor_id
        if (filtros.pagada === 'true') params.pagada = true
        if (filtros.pagada === 'false') params.pagada = false
        if (filtros.desde) params.desde = filtros.desde
        if (filtros.hasta) params.hasta = filtros.hasta
        const r = await getFacturasProveedor(params)
        setFacturas(Array.isArray(r.data) ? r.data : [])
        setPendientes([])
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar facturas')
      setFacturas([])
      setPendientes([])
    } finally {
      setLoading(false)
    }
  }, [tabActiva, filtros])

  useEffect(() => {
    cargarFacturas()
  }, [cargarFacturas])

  const listaMostrada = tabActiva === 'pendientes' ? pendientes : facturas

  const abrirLineas = async (f) => {
    setModalLineas({ ...f, lineas: [] })
    setLineasDetalleLoading(true)
    try {
      const r = await getFacturaProveedor(f.id)
      setModalLineas(r.data)
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar líneas',
        type: 'err',
      })
      setModalLineas(null)
    } finally {
      setLineasDetalleLoading(false)
    }
  }

  const marcarPagada = async (id) => {
    try {
      await pagarFactura(id)
      setFeedback({ msg: 'Factura marcada como pagada', type: 'ok' })
      cargarFacturas()
      if (modalLineas?.id === id) {
        setModalLineas((m) => (m ? { ...m, pagada: true } : null))
      }
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'No se pudo marcar como pagada',
        type: 'err',
      })
    }
  }

  const syncProveedorUrl = (id) => {
    if (id) {
      setSearchParams({ proveedor_id: id })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] px-4 py-6 dark:bg-[#0f1117] md:px-6">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-amber-500" size={28} strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Facturas de proveedores
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/proveedores"
            className="inline-flex h-10 items-center rounded-lg border border-[#e2e5ed] px-4 text-sm font-medium text-[#111827] dark:border-[#2e3347] dark:text-[#e8eaf0]"
          >
            Proveedores
          </Link>
          {puedeEscribir ? (
            <>
              <button
                type="button"
                onClick={() => setModalFactura(true)}
                className={BTN_PRIMARY}
              >
                <Plus size={18} strokeWidth={1.5} />
                Nueva factura
              </button>
              <button
                type="button"
                onClick={() => {
                  setResultadoIA(null)
                  setModalIA(true)
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-800 dark:text-amber-400"
              >
                <ScanLine size={18} strokeWidth={1.5} />
                Escanear con IA
              </button>
            </>
          ) : null}
        </div>
      </header>

      {feedback?.msg ? (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
        >
          {feedback.type === 'ok' ? (
            <Check size={18} strokeWidth={1.5} />
          ) : (
            <AlertTriangle size={18} strokeWidth={1.5} />
          )}
          {feedback.msg}
        </div>
      ) : null}

      <div className="mb-4 flex gap-2 border-b border-[#e2e5ed] dark:border-[#2e3347]">
        <button
          type="button"
          onClick={() => setTabActiva('todas')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tabActiva === 'todas'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setTabActiva('pendientes')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tabActiva === 'pendientes'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Pendientes de pago
        </button>
      </div>

      {tabActiva === 'todas' ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Proveedor
            <select
              value={filtros.proveedor_id}
              onChange={(e) => {
                const v = e.target.value
                setFiltros((f) => ({ ...f, proveedor_id: v }))
                syncProveedorUrl(v)
              }}
              className={`${INPUT} mt-1`}
            >
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Estado pago
            <select
              value={filtros.pagada}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, pagada: e.target.value }))
              }
              className={`${INPUT} mt-1`}
            >
              <option value="">Todas</option>
              <option value="false">Pendientes</option>
              <option value="true">Pagadas</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Desde
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, desde: e.target.value }))
              }
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Hasta
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, hasta: e.target.value }))
              }
              className={`${INPUT} mt-1`}
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading ? (
        <Loader />
      ) : listaMostrada.length === 0 ? (
        <EmptyState message="No hay facturas" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[#e2e5ed] bg-white shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Fecha
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Nº Factura
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Proveedor
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Total
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Vencimiento
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Estado
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {listaMostrada.map((f) => {
                  const dias =
                    tabActiva === 'pendientes' && f.dias_vencimiento != null
                      ? f.dias_vencimiento
                      : diasHastaVencimiento(f.fecha_vencimiento)
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                    >
                      <td className="px-3 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {fechaCorta(f.fecha)}
                      </td>
                      <td className="px-3 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {f.numero_factura || '—'}
                      </td>
                      <td className="px-3 py-2 text-[#111827] dark:text-[#e8eaf0]">
                        {f.proveedor_nombre || '—'}
                      </td>
                      <td className="px-3 py-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {formatEuro(f.total)}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {textoVencimiento(f, dias)}
                      </td>
                      <td className="px-3 py-2">{badgeEstadoPago(f, dias)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {puedeEscribir && !f.pagada ? (
                            <button
                              type="button"
                              onClick={() => marcarPagada(f.id)}
                              className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                            >
                              Marcar pagada
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => abrirLineas(f)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#e2e5ed] px-2 py-1 text-xs dark:border-[#2e3347]"
                          >
                            <Eye size={14} strokeWidth={1.5} />
                            Ver líneas
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {listaMostrada.map((f) => {
              const dias =
                tabActiva === 'pendientes' && f.dias_vencimiento != null
                  ? f.dias_vencimiento
                  : diasHastaVencimiento(f.fecha_vencimiento)
              return (
                <div
                  key={f.id}
                  className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {f.proveedor_nombre}
                    </span>
                    {badgeEstadoPago(f, dias)}
                  </div>
                  <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    {fechaCorta(f.fecha)} · {f.numero_factura || 'S/N'}
                  </p>
                  <p className="mt-2 text-lg font-bold text-amber-500">
                    {formatEuro(f.total)}
                  </p>
                  <p className="mt-1 text-sm">{textoVencimiento(f, dias)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {puedeEscribir && !f.pagada ? (
                      <button
                        type="button"
                        onClick={() => marcarPagada(f.id)}
                        className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-400"
                      >
                        Marcar pagada
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => abrirLineas(f)}
                      className="rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm dark:border-[#2e3347]"
                    >
                      Ver líneas
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {modalFactura ? (
        <ModalNuevaFactura
          proveedores={proveedores}
          articulos={articulos}
          onClose={() => setModalFactura(false)}
          onGuardado={() => {
            setModalFactura(false)
            setFeedback({ msg: 'Factura creada', type: 'ok' })
            cargarFacturas()
          }}
          onError={(msg) => setFeedback({ msg, type: 'err' })}
        />
      ) : null}

      {modalLineas ? (
        <ModalLineasFactura
          factura={modalLineas}
          loading={lineasDetalleLoading}
          puedeEscribir={puedeEscribir}
          onClose={() => setModalLineas(null)}
          onMarcarPagada={() => marcarPagada(modalLineas.id)}
        />
      ) : null}

      {modalIA ? (
        <ModalEscanearIA
          proveedores={proveedores}
          articulos={articulos}
          escaneando={escaneando}
          setEscaneando={setEscaneando}
          resultadoIA={resultadoIA}
          setResultadoIA={setResultadoIA}
          onClose={() => {
            setModalIA(false)
            setResultadoIA(null)
          }}
          onGuardado={() => {
            setModalIA(false)
            setResultadoIA(null)
            setFeedback({ msg: 'Factura guardada', type: 'ok' })
            cargarFacturas()
          }}
          onError={(msg) => setFeedback({ msg, type: 'err' })}
        />
      ) : null}
    </div>
  )
}

function ModalNuevaFactura({
  proveedores,
  articulos,
  onClose,
  onGuardado,
  onError,
}) {
  const [proveedorId, setProveedorId] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [fechaVenc, setFechaVenc] = useState('')
  const [lineas, setLineas] = useState([
    { articulo_id: '', cantidad: '1', coste_unitario: '' },
  ])
  const [saving, setSaving] = useState(false)

  const totalCalc = useMemo(() => {
    let s = 0
    for (const ln of lineas) {
      const c = parseFloat(String(ln.cantidad).replace(',', '.')) || 0
      const cu = parseFloat(String(ln.coste_unitario).replace(',', '.')) || 0
      s += c * cu
    }
    return Math.round(s * 100) / 100
  }, [lineas])

  const addLinea = () => {
    setLineas((l) => [
      ...l,
      { articulo_id: '', cantidad: '1', coste_unitario: '' },
    ])
  }

  const removeLinea = (i) => {
    setLineas((l) => l.filter((_, j) => j !== i))
  }

  const updateLinea = (i, field, val) => {
    setLineas((l) =>
      l.map((row, j) => (j === i ? { ...row, [field]: val } : row))
    )
  }

  const guardar = async () => {
    if (!proveedorId) {
      onError('Selecciona un proveedor')
      return
    }
    const lineasBody = []
    for (const ln of lineas) {
      if (!ln.articulo_id) {
        onError('Cada línea debe tener artículo')
        return
      }
      const cant = parseFloat(String(ln.cantidad).replace(',', '.'))
      const cu = parseFloat(String(ln.coste_unitario).replace(',', '.'))
      if (!(cant > 0) || cu < 0 || Number.isNaN(cant) || Number.isNaN(cu)) {
        onError('Cantidad y coste unitario inválidos')
        return
      }
      lineasBody.push({
        articulo_id: ln.articulo_id,
        cantidad: cant,
        coste_unitario: cu,
      })
    }
    setSaving(true)
    try {
      await createFacturaProveedor({
        proveedor_id: proveedorId,
        numero_factura: numeroFactura.trim() || null,
        fecha,
        fecha_vencimiento: fechaVenc || null,
        total: totalCalc,
        lineas: lineasBody,
      })
      onGuardado()
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al crear factura')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            <Building2 size={22} strokeWidth={1.5} />
            Nueva factura
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Proveedor *
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className={`${INPUT} mt-1`}
            >
              <option value="">—</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Nº factura
            <input
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Fecha *
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Fecha vencimiento
            <input
              type="date"
              value={fechaVenc}
              onChange={(e) => setFechaVenc(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>

          <div className="border-t border-[#e2e5ed] pt-3 dark:border-[#2e3347]">
            <p className="mb-2 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Líneas
            </p>
            {lineas.map((ln, i) => (
              <div
                key={i}
                className="mb-3 rounded-lg border border-[#e2e5ed] p-3 dark:border-[#2e3347]"
              >
                <select
                  value={ln.articulo_id}
                  onChange={(e) =>
                    updateLinea(i, 'articulo_id', e.target.value)
                  }
                  className={INPUT}
                >
                  <option value="">Artículo</option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder="Cantidad"
                    value={ln.cantidad}
                    onChange={(e) =>
                      updateLinea(i, 'cantidad', e.target.value)
                    }
                    className={INPUT}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Coste u."
                    value={ln.coste_unitario}
                    onChange={(e) =>
                      updateLinea(i, 'coste_unitario', e.target.value)
                    }
                    className={INPUT}
                  />
                </div>
                {lineas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLinea(i)}
                    className="mt-2 text-xs text-red-500"
                  >
                    Eliminar línea
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={addLinea}
              className="text-sm font-medium text-amber-600 dark:text-amber-400"
            >
              + Añadir línea
            </button>
          </div>

          <p className="flex items-center gap-2 text-lg font-bold text-amber-500">
            <DollarSign size={22} strokeWidth={1.5} />
            Total: {formatEuro(totalCalc)}
          </p>

          <button
            type="button"
            disabled={saving}
            onClick={guardar}
            className={`${BTN_PRIMARY} w-full`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalLineasFactura({
  factura,
  loading,
  puedeEscribir,
  onClose,
  onMarcarPagada,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            Líneas de factura
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-2 p-4 text-sm text-[#111827] dark:text-[#e8eaf0]">
          <p>
            <span className="text-[#6b7280] dark:text-[#8b90a7]">
              Proveedor:{' '}
            </span>
            {factura.proveedor_nombre}
          </p>
          <p>
            <span className="text-[#6b7280] dark:text-[#8b90a7]">Fecha: </span>
            {fechaCorta(factura.fecha)}
          </p>
          <p className="text-lg font-bold text-amber-500">
            Total: {formatEuro(factura.total)}
          </p>
          {loading ? (
            <Loader />
          ) : (
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="py-2 text-left">Artículo</th>
                  <th className="py-2 text-right">Cant.</th>
                  <th className="py-2 text-right">P. unit</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(factura.lineas || []).map((ln) => (
                  <tr
                    key={ln.id}
                    className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                  >
                    <td className="py-2">
                      {ln.articulo_nombre || ln.articulo_id || '—'}
                    </td>
                    <td className="py-2 text-right">{ln.cantidad}</td>
                    <td className="py-2 text-right">
                      {formatEuro(ln.coste_unitario)}
                    </td>
                    <td className="py-2 text-right">
                      {formatEuro(ln.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {puedeEscribir && !factura.pagada ? (
            <button
              type="button"
              onClick={onMarcarPagada}
              className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white dark:bg-emerald-700"
            >
              Marcar como pagada
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ModalEscanearIA({
  proveedores,
  articulos,
  escaneando,
  setEscaneando,
  resultadoIA,
  setResultadoIA,
  onClose,
  onGuardado,
  onError,
}) {
  const [file, setFile] = useState(null)
  const [proveedorIA, setProveedorIA] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [fechaVenc, setFechaVenc] = useState('')
  const [lineasEdit, setLineasEdit] = useState([])
  const [saving, setSaving] = useState(false)

  const syncLineasFromResult = (data) => {
    const raw = Array.isArray(data?.lineas) ? data.lineas : []
    setLineasEdit(
      raw.map((ln) => ({
        descripcion: String(ln.descripcion ?? ''),
        cantidad: String(ln.cantidad ?? ''),
        precio_unitario: String(ln.precio_unitario ?? ''),
        subtotal: String(ln.subtotal ?? ''),
        articulo_id: '',
      }))
    )
    setNumeroFactura(data?.numero_factura || '')
    if (data?.fecha && /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
      setFecha(data.fecha)
    }
  }

  const totalIA = useMemo(() => {
    let s = 0
    for (const ln of lineasEdit) {
      const sub = parseFloat(String(ln.subtotal).replace(',', '.'))
      if (!Number.isNaN(sub)) s += sub
      else {
        const c = parseFloat(String(ln.cantidad).replace(',', '.')) || 0
        const p = parseFloat(String(ln.precio_unitario).replace(',', '.')) || 0
        s += c * p
      }
    }
    return Math.round(s * 100) / 100
  }, [lineasEdit])

  const escanear = async () => {
    if (!file) {
      onError('Selecciona una imagen')
      return
    }
    setEscaneando(true)
    setResultadoIA(null)
    try {
      const b64 = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      const body = {
        imagen_base64: b64,
        proveedor_id: proveedorIA || undefined,
      }
      const res = await escanearFacturaIA(body)
      const data = res.data
      setResultadoIA(data)
      if (data?.error) {
        onError(data.error)
      }
      syncLineasFromResult(data)
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al escanear')
      setResultadoIA({ error: String(e), lineas: [] })
    } finally {
      setEscaneando(false)
    }
  }

  const updateLineaIA = (i, field, val) => {
    setLineasEdit((l) =>
      l.map((row, j) => (j === i ? { ...row, [field]: val } : row))
    )
  }

  const confirmarGuardar = async () => {
    if (!proveedorIA) {
      onError('Selecciona proveedor')
      return
    }
    const lineasBody = []
    for (const ln of lineasEdit) {
      if (!ln.articulo_id) {
        onError('Asigna un artículo a cada línea')
        return
      }
      const cant = parseFloat(String(ln.cantidad).replace(',', '.'))
      const cu = parseFloat(String(ln.precio_unitario).replace(',', '.'))
      if (!(cant > 0) || cu < 0 || Number.isNaN(cant) || Number.isNaN(cu)) {
        onError('Cantidad y coste inválidos en líneas')
        return
      }
      lineasBody.push({
        articulo_id: ln.articulo_id,
        cantidad: cant,
        coste_unitario: cu,
      })
    }
    setSaving(true)
    try {
      await createFacturaProveedor({
        proveedor_id: proveedorIA,
        numero_factura: numeroFactura.trim() || null,
        fecha,
        fecha_vencimiento: fechaVenc || null,
        total: totalIA,
        lineas: lineasBody,
      })
      onGuardado()
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            <ScanLine size={22} strokeWidth={1.5} />
            Escanear con IA
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Sube una foto de la factura
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#e2e5ed] py-8 dark:border-[#2e3347]">
            <Upload size={32} strokeWidth={1.5} className="text-amber-500" />
            <span className="text-sm text-[#111827] dark:text-[#e8eaf0]">
              {file ? file.name : 'Elegir imagen'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            type="button"
            disabled={escaneando || !file}
            onClick={escanear}
            className={`${BTN_PRIMARY} w-full`}
          >
            {escaneando ? (
              <>
                <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
                Analizando factura...
              </>
            ) : (
              <>
                <ScanLine size={18} strokeWidth={1.5} />
                Escanear con IA
              </>
            )}
          </button>

          {resultadoIA?.error && lineasEdit.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {resultadoIA.error}. Puedes crear la factura manualmente con
              &quot;Nueva factura&quot;.
            </p>
          ) : null}

          {lineasEdit.length > 0 || resultadoIA?.lineas?.length ? (
            <>
              <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
                Proveedor (asignar) *
                <select
                  value={proveedorIA}
                  onChange={(e) => setProveedorIA(e.target.value)}
                  className={`${INPUT} mt-1`}
                >
                  <option value="">—</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
                Nº factura
                <input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className={`${INPUT} mt-1`}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
                  Fecha
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className={`${INPUT} mt-1`}
                  />
                </label>
                <label className="text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
                  Vencimiento
                  <input
                    type="date"
                    value={fechaVenc}
                    onChange={(e) => setFechaVenc(e.target.value)}
                    className={`${INPUT} mt-1`}
                  />
                </label>
              </div>
              <p className="text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
                Líneas detectadas (corrige y asigna artículo)
              </p>
              {lineasEdit.map((ln, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-lg border border-[#e2e5ed] p-3 dark:border-[#2e3347]"
                >
                  <input
                    value={ln.descripcion}
                    onChange={(e) =>
                      updateLineaIA(i, 'descripcion', e.target.value)
                    }
                    placeholder="Descripción"
                    className={INPUT}
                  />
                  <select
                    value={ln.articulo_id}
                    onChange={(e) =>
                      updateLineaIA(i, 'articulo_id', e.target.value)
                    }
                    className={INPUT}
                  >
                    <option value="">Artículo *</option>
                    {articulos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      value={ln.cantidad}
                      onChange={(e) =>
                        updateLineaIA(i, 'cantidad', e.target.value)
                      }
                      placeholder="Cant."
                      className={INPUT}
                    />
                    <input
                      value={ln.precio_unitario}
                      onChange={(e) =>
                        updateLineaIA(i, 'precio_unitario', e.target.value)
                      }
                      placeholder="P. unit"
                      className={INPUT}
                    />
                    <input
                      value={ln.subtotal}
                      onChange={(e) =>
                        updateLineaIA(i, 'subtotal', e.target.value)
                      }
                      placeholder="Subtotal"
                      className={INPUT}
                    />
                  </div>
                </div>
              ))}
              <p className="text-lg font-bold text-amber-500">
                Total: {formatEuro(totalIA)}
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={confirmarGuardar}
                className={`${BTN_PRIMARY} w-full`}
              >
                <Check size={18} strokeWidth={1.5} />
                Confirmar y guardar
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
