import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Euro, Layers, Package } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import StatCard from '../../components/shared/StatCard'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_ACCESO = ['admin', 'director', 'almacen']

const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#e8eaf0]'
const SELECT = `${INPUT} appearance-none`
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
const PAGE_BG = 'min-h-full bg-[#f4f6f9] dark:bg-[#0f1117]'
const TAB_BTN =
  'h-12 min-h-[48px] border-b-2 px-4 text-[15px] font-semibold transition-colors'
const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] disabled:opacity-40'
const TABLE_HEAD =
  'border-b border-[#e2e5ed] bg-[#f0f2f5] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#8b90a7]'
const TABLE_CELL = 'border-b border-[#e2e5ed] px-4 py-3 text-sm dark:border-[#2e3347]'

function parseApiError(e) {
  const det = e.response?.data?.detail
  if (typeof det === 'string') return det
  if (Array.isArray(det))
    return det.map((x) => x.msg || JSON.stringify(x)).join(', ')
  return 'Error en la operación'
}

function formatFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Días hasta la fecha de caducidad (medianoche local). null si no hay fecha. */
function diasHastaCaducidad(fechaIso) {
  if (!fechaIso) return null
  const end = new Date(fechaIso)
  if (Number.isNaN(end.getTime())) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end - start) / 86400000)
}

/** Tab Lotes: rojo <3 días, ámbar hasta 7 días, verde >7, gris sin fecha */
function caducidadLotesClass(dias) {
  if (dias === null) return 'text-[#6b7280] dark:text-[#8b90a7]'
  if (dias < 0) return 'font-medium text-red-600 dark:text-red-400'
  if (dias < 3) return 'font-medium text-red-600 dark:text-red-400'
  if (dias <= 7) return 'font-medium text-amber-600 dark:text-amber-400'
  return 'font-medium text-emerald-600 dark:text-emerald-400'
}

/** Tab alertas: badge rojo <=3, amber <=7, verde >7 */
function badgeDiasRestantesClass(d) {
  if (d <= 3) return 'bg-red-500/15 text-red-600 dark:text-red-400'
  if (d <= 7) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
}

function formatEuroFromStrings(cantStr, costeStr) {
  const c = Number(cantStr)
  const u = Number(costeStr)
  if (Number.isNaN(c) || Number.isNaN(u)) return '—'
  return `${(c * u).toFixed(2)} €`
}

function emptyNuevoLote() {
  return {
    articulo_id: '',
    cantidad: '',
    coste_unitario: '',
    fecha_caducidad: '',
    numero_lote: '',
  }
}

function emptyConsumir() {
  return {
    articulo_id: '',
    cantidad: '',
    motivo: '',
  }
}

export default function FIFOPage() {
  const { user, isLoading: authLoading } = useAuth()
  const puedeAcceder = user && ROLES_ACCESO.includes(user.rol)

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

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_ACCESO.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div
      className={`${PAGE_BG} px-4 py-6 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:px-6`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Layers
            className="shrink-0 text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Stock FIFO
          </h1>
        </div>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[#e2e5ed] pb-px dark:border-[#2e3347]">
        <button
          type="button"
          onClick={() => setMainTab('lotes')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'lotes'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Lotes
        </button>
        <button
          type="button"
          onClick={() => setMainTab('alertas')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'alertas'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Alertas caducidad
        </button>
        <button
          type="button"
          onClick={() => setMainTab('valoracion')}
          className={`${TAB_BTN} shrink-0 ${
            mainTab === 'valoracion'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Valoración stock
        </button>
      </div>

      {/* ——— TAB LOTES ——— */}
      {mainTab === 'lotes' ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl lg:flex-1">
              <div>
                <label
                  htmlFor="fifo-articulo"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Artículo
                </label>
                <select
                  id="fifo-articulo"
                  value={filtroArticuloId}
                  onChange={(e) => setFiltroArticuloId(e.target.value)}
                  className={SELECT}
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
              <div className="flex flex-col justify-end">
                <span className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
                  Solo activos
                </span>
                <button
                  type="button"
                  onClick={() => setSoloActivos((v) => !v)}
                  aria-pressed={soloActivos}
                  className={`inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg border px-4 text-[15px] font-semibold transition-colors ${
                    soloActivos
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-[#e2e5ed] bg-white text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0]'
                  }`}
                >
                  {soloActivos ? 'Sí' : 'No'}
                </button>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:w-auto">
              <button
                type="button"
                onClick={() => {
                  setFormNuevo(emptyNuevoLote())
                  setModalNuevoErr(null)
                  setModalNuevo(true)
                }}
                className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 sm:w-auto"
              >
                Nuevo lote
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormConsumir(emptyConsumir())
                  setModalConsumirErr(null)
                  setModalConsumir(true)
                }}
                className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-red-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-red-700 sm:w-auto"
              >
                Consumir
              </button>
            </div>
          </div>

          {errorLotes ? (
            <p className="text-sm text-red-600 dark:text-red-400">{errorLotes}</p>
          ) : null}

          {loadingLotes && !lotes.length ? (
            <Loader />
          ) : !lotes.length ? (
            <EmptyState message="No hay lotes con los filtros actuales." />
          ) : (
            <>
              <div className={`${SURFACE} hidden overflow-x-auto md:block`}>
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Artículo</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Lote</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Cantidad</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Coste unit.</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Valor</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Caducidad</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Fecha entrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotes.map((row) => {
                      const dCad = diasHastaCaducidad(row.fecha_caducidad)
                      return (
                        <tr
                          key={row.id}
                          className="text-[#111827] dark:text-[#e8eaf0]"
                        >
                          <td className={`${TABLE_CELL} font-medium`}>
                            {row.nombre_articulo || articuloLabel(row.articulo_id)}
                          </td>
                          <td className={TABLE_CELL}>
                            {row.numero_lote?.trim() || '—'}
                          </td>
                          <td className={TABLE_CELL}>
                            {row.cantidad}{' '}
                            <span className="text-[#6b7280] dark:text-[#8b90a7]">
                              {row.unidad_medida || ''}
                            </span>
                          </td>
                          <td className={TABLE_CELL}>
                            {Number(row.coste_unitario).toFixed(2)} €
                          </td>
                          <td className={TABLE_CELL}>
                            {formatEuroFromStrings(row.cantidad, row.coste_unitario)}
                          </td>
                          <td className={TABLE_CELL}>
                            <span className={caducidadLotesClass(dCad)}>
                              {row.fecha_caducidad
                                ? formatFecha(row.fecha_caducidad)
                                : '—'}
                            </span>
                          </td>
                          <td className={`${TABLE_CELL} text-[#6b7280] dark:text-[#8b90a7]`}>
                            {formatFecha(row.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {lotes.map((row) => {
                  const dCad = diasHastaCaducidad(row.fecha_caducidad)
                  return (
                    <div key={row.id} className={`${SURFACE} p-4`}>
                      <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        {row.nombre_articulo || articuloLabel(row.articulo_id)}
                      </p>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                            Lote
                          </dt>
                          <dd>{row.numero_lote?.trim() || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                            Cantidad
                          </dt>
                          <dd>
                            {row.cantidad} {row.unidad_medida || ''}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                            Coste unit.
                          </dt>
                          <dd>{Number(row.coste_unitario).toFixed(2)} €</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                            Valor
                          </dt>
                          <dd>
                            {formatEuroFromStrings(row.cantidad, row.coste_unitario)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                            Caducidad
                          </dt>
                          <dd className={caducidadLotesClass(dCad)}>
                            {row.fecha_caducidad
                              ? formatFecha(row.fecha_caducidad)
                              : '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                            Fecha entrada
                          </dt>
                          <dd className="text-[#6b7280] dark:text-[#8b90a7]">
                            {formatFecha(row.created_at)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* ——— TAB ALERTAS ——— */}
      {mainTab === 'alertas' ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:max-w-[140px]">
              <label
                htmlFor="fifo-dias-alerta"
                className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
              >
                Días
              </label>
              <input
                id="fifo-dias-alerta"
                type="number"
                min={1}
                max={365}
                value={diasAlerta}
                onChange={(e) => setDiasAlerta(e.target.value)}
                className={INPUT}
              />
            </div>
            <button
              type="button"
              onClick={() => buscarAlertas()}
              className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-6 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 sm:w-auto"
            >
              Buscar
            </button>
          </div>

          {errorAlertas ? (
            <p className="text-sm text-red-600 dark:text-red-400">{errorAlertas}</p>
          ) : null}

          {!alertasBuscado ? (
            <EmptyState message="Indica los días y pulsa Buscar." />
          ) : loadingAlertas ? (
            <Loader />
          ) : !alertas.length ? (
            <EmptyState message="No hay alertas en ese rango." />
          ) : (
            <>
              <div className={`${SURFACE} hidden overflow-x-auto md:block`}>
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Artículo</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Lote</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Cantidad</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>Caducidad</th>
                      <th className={`${TABLE_HEAD} px-4 py-3`}>
                        Días restantes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertas.map((row) => (
                      <tr
                        key={row.id}
                        className="text-[#111827] dark:text-[#e8eaf0]"
                      >
                        <td className={`${TABLE_CELL} font-medium`}>
                          {row.nombre_articulo}
                        </td>
                        <td className={TABLE_CELL}>
                          {row.numero_lote?.trim() || '—'}
                        </td>
                        <td className={TABLE_CELL}>
                          {row.cantidad} {row.unidad_medida || ''}
                        </td>
                        <td className={TABLE_CELL}>
                          {formatFecha(row.fecha_caducidad)}
                        </td>
                        <td className={TABLE_CELL}>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeDiasRestantesClass(row.dias_restantes ?? 0)}`}
                          >
                            {row.dias_restantes ?? 0} d
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {alertas.map((row) => (
                  <div key={row.id} className={`${SURFACE} p-4`}>
                    <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {row.nombre_articulo}
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          Lote
                        </dt>
                        <dd>{row.numero_lote?.trim() || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          Cantidad
                        </dt>
                        <dd>
                          {row.cantidad} {row.unidad_medida || ''}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          Caducidad
                        </dt>
                        <dd>{formatFecha(row.fecha_caducidad)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          Días restantes
                        </dt>
                        <dd>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeDiasRestantesClass(row.dias_restantes ?? 0)}`}
                          >
                            {row.dias_restantes ?? 0} d
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* ——— TAB VALORACIÓN ——— */}
      {mainTab === 'valoracion' ? (
        <section className="space-y-4">
          {errorValoracion ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorValoracion}
            </p>
          ) : null}

          {loadingValoracion && !valoracion ? (
            <Loader />
          ) : valoracion ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2 [&>div]:p-8 [&>div>p]:!text-4xl md:[&>div>p]:!text-5xl">
                  <StatCard
                    label="Valor total almacén"
                    value={`${Number(valoracion.valor_total_almacen).toFixed(2)} €`}
                    Icon={Euro}
                    color="amber"
                  />
                </div>
                <StatCard
                  label="Nº artículos con stock"
                  value={String(valoracion.num_articulos ?? 0)}
                  Icon={Package}
                  color="white"
                />
              </div>

              {!valoracion.articulos?.length ? (
                <EmptyState message="Sin líneas de valoración." />
              ) : (
                <>
                  <div className={`${SURFACE} hidden overflow-x-auto md:block`}>
                    <table className="w-full min-w-[720px] border-collapse">
                      <thead>
                        <tr>
                          <th className={`${TABLE_HEAD} px-4 py-3`}>
                            Artículo
                          </th>
                          <th className={`${TABLE_HEAD} px-4 py-3`}>SKU</th>
                          <th className={`${TABLE_HEAD} px-4 py-3`}>
                            Stock total
                          </th>
                          <th className={`${TABLE_HEAD} px-4 py-3`}>
                            Coste medio
                          </th>
                          <th className={`${TABLE_HEAD} px-4 py-3`}>
                            Valor total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {valoracion.articulos.map((row) => (
                          <tr
                            key={row.articulo_id}
                            className="text-[#111827] dark:text-[#e8eaf0]"
                          >
                            <td className={`${TABLE_CELL} font-medium`}>
                              {row.nombre}
                            </td>
                            <td className={TABLE_CELL}>{row.sku || '—'}</td>
                            <td className={TABLE_CELL}>
                              {row.stock_total}{' '}
                              <span className="text-[#6b7280] dark:text-[#8b90a7]">
                                {row.unidad_medida || ''}
                              </span>
                            </td>
                            <td className={TABLE_CELL}>
                              {Number(row.coste_medio).toFixed(2)} €
                            </td>
                            <td className={TABLE_CELL}>
                              {Number(row.valor_total).toFixed(2)} €
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-[#f0f2f5] font-bold text-[#111827] dark:bg-[#222536] dark:text-[#e8eaf0]">
                          <td className={TABLE_CELL} colSpan={4}>
                            Total
                          </td>
                          <td className={TABLE_CELL}>
                            {totalValoracionTabla.toFixed(2)} €
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {valoracion.articulos.map((row) => (
                      <div
                        key={row.articulo_id}
                        className={`${SURFACE} p-4`}
                      >
                        <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                          {row.nombre}
                        </p>
                        <dl className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                              SKU
                            </dt>
                            <dd>{row.sku || '—'}</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                              Stock total
                            </dt>
                            <dd>
                              {row.stock_total} {row.unidad_medida || ''}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                              Coste medio
                            </dt>
                            <dd>{Number(row.coste_medio).toFixed(2)} €</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                              Valor total
                            </dt>
                            <dd className="font-semibold">
                              {Number(row.valor_total).toFixed(2)} €
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                    <div
                      className={`${SURFACE} flex items-center justify-between p-4 font-bold text-[#111827] dark:text-[#e8eaf0]`}
                    >
                      <span>Total</span>
                      <span>{totalValoracionTabla.toFixed(2)} €</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <EmptyState message="Sin datos de valoración." />
          )}
        </section>
      ) : null}

      {/* Modal nuevo lote */}
      {modalNuevo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fifo-modal-nuevo-title"
            className={`${SURFACE} w-full max-w-md p-6 shadow-xl`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2
              id="fifo-modal-nuevo-title"
              className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
            >
              Nuevo lote
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="nl-articulo"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Artículo *
                </label>
                <select
                  id="nl-articulo"
                  value={formNuevo.articulo_id}
                  onChange={(e) =>
                    setFormNuevo((f) => ({ ...f, articulo_id: e.target.value }))
                  }
                  className={SELECT}
                >
                  <option value="">Seleccionar…</option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="nl-cantidad"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Cantidad *
                </label>
                <input
                  id="nl-cantidad"
                  type="number"
                  min="0"
                  step="any"
                  value={formNuevo.cantidad}
                  onChange={(e) =>
                    setFormNuevo((f) => ({ ...f, cantidad: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label
                  htmlFor="nl-coste"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Coste unitario *
                </label>
                <input
                  id="nl-coste"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formNuevo.coste_unitario}
                  onChange={(e) =>
                    setFormNuevo((f) => ({
                      ...f,
                      coste_unitario: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label
                  htmlFor="nl-cad"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Fecha caducidad
                </label>
                <input
                  id="nl-cad"
                  type="date"
                  value={formNuevo.fecha_caducidad}
                  onChange={(e) =>
                    setFormNuevo((f) => ({
                      ...f,
                      fecha_caducidad: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label
                  htmlFor="nl-num"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Número de lote
                </label>
                <input
                  id="nl-num"
                  type="text"
                  value={formNuevo.numero_lote}
                  onChange={(e) =>
                    setFormNuevo((f) => ({ ...f, numero_lote: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
            </div>
            {modalNuevoErr ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {modalNuevoErr}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !savingNuevo && setModalNuevo(false)}
                className={`${BTN_SECONDARY} w-full sm:w-auto`}
                disabled={savingNuevo}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarNuevoLote}
                disabled={savingNuevo}
                className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black hover:bg-amber-600 disabled:opacity-40 sm:w-auto"
              >
                {savingNuevo ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal consumir */}
      {modalConsumir ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fifo-modal-consumir-title"
            className={`${SURFACE} w-full max-w-md p-6 shadow-xl`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2
              id="fifo-modal-consumir-title"
              className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
            >
              Consumir stock FIFO
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="co-articulo"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Artículo *
                </label>
                <select
                  id="co-articulo"
                  value={formConsumir.articulo_id}
                  onChange={(e) =>
                    setFormConsumir((f) => ({
                      ...f,
                      articulo_id: e.target.value,
                    }))
                  }
                  className={SELECT}
                >
                  <option value="">Seleccionar…</option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="co-cantidad"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Cantidad *
                </label>
                <input
                  id="co-cantidad"
                  type="number"
                  min="0"
                  step="any"
                  value={formConsumir.cantidad}
                  onChange={(e) =>
                    setFormConsumir((f) => ({ ...f, cantidad: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label
                  htmlFor="co-motivo"
                  className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
                >
                  Motivo *
                </label>
                <input
                  id="co-motivo"
                  type="text"
                  value={formConsumir.motivo}
                  onChange={(e) =>
                    setFormConsumir((f) => ({ ...f, motivo: e.target.value }))
                  }
                  className={INPUT}
                />
              </div>
              <p className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] p-3 text-sm text-[#6b7280] dark:border-[#2e3347] dark:bg-[#0f1117] dark:text-[#8b90a7]">
                El sistema consumirá automáticamente los lotes más antiguos
                primero.
              </p>
            </div>
            {modalConsumirErr ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {modalConsumirErr}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !savingConsumir && setModalConsumir(false)}
                className={`${BTN_SECONDARY} w-full sm:w-auto`}
                disabled={savingConsumir}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarConsumir}
                disabled={savingConsumir}
                className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-red-600 px-4 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-40 sm:w-auto"
              >
                {savingConsumir ? 'Consumiendo…' : 'Consumir'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
