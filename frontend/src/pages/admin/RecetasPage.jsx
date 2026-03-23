import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChefHat,
  Edit,
  Plus,
  Save,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  addIngredienteReceta,
  createReceta,
  deleteIngredienteReceta,
  getAdminProductos,
  getArticulosInventario,
  getRecetaCoste,
  getRecetasSemaforo,
  updateReceta,
} from '../../services/api'
import RecetaDetalleIngredientesSection from './recetas/RecetaDetalleIngredientesSection'
import { UNIDADES_OPTS, formatEuro } from './recetas/recetasUtils'

const INPUT =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const BTN_DANGER =
  'h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm transition-colors'
const CARD_BASE =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl p-5 cursor-pointer transition-all duration-200'
function semaforoMeta(s) {
  switch (s) {
    case 'verde':
      return {
        bar: 'bg-emerald-500',
        text: 'text-emerald-500',
        border: 'border-emerald-500/50',
        badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        dot: 'bg-emerald-500',
        label: 'Rentable',
      }
    case 'amarillo':
      return {
        bar: 'bg-amber-500',
        text: 'text-amber-500',
        border: 'border-amber-500/50',
        badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        dot: 'bg-amber-500',
        label: 'Revisar',
      }
    case 'rojo':
      return {
        bar: 'bg-red-500',
        text: 'text-red-500',
        border: 'border-red-500/50',
        badge: 'bg-red-500/10 text-red-500 border-red-500/20',
        dot: 'bg-red-500',
        label: 'Crítico',
      }
    default:
      return {
        bar: 'bg-zinc-400 dark:bg-zinc-600',
        text: 'text-[#6b7280] dark:text-[#8b90a7]',
        border: 'border-zinc-400/50',
        badge: 'bg-[#f0f2f5] text-[#6b7280] border-[#e2e5ed] dark:bg-[#222536] dark:text-[#8b90a7] dark:border-[#2e3347]',
        dot: 'bg-zinc-400',
        label: 'Sin receta',
      }
  }
}

function useFeedback() {
  const [feedback, setFeedback] = useState(null)
  useEffect(() => {
    if (!feedback) return undefined
    const t = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(t)
  }, [feedback])
  return [feedback, setFeedback]
}

export default function RecetasPage() {
  const [recetasSemaforo, setRecetasSemaforo] = useState([])
  const [filtroColor, setFiltroColor] = useState('todos')
  const [recetaDetalle, setRecetaDetalle] = useState(null)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [modalCrear, setModalCrear] = useState(false)
  const [loadingSemaforo, setLoadingSemaforo] = useState(true)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [loadingAddIngrediente, setLoadingAddIngrediente] = useState(false)
  const [articulos, setArticulos] = useState([])
  const [productos, setProductos] = useState([])
  const [formIngrediente, setFormIngrediente] = useState({
    articulo_id: '',
    cantidad_neta: '',
    porcentaje_merma: '0',
    unidad: 'kg',
  })
  const [formCrear, setFormCrear] = useState({
    producto_id: '',
    rendimiento: '1',
    instrucciones: '',
  })
  const [instruccionesDraft, setInstruccionesDraft] = useState('')
  const [savingInstrucciones, setSavingInstrucciones] = useState(false)
  const [feedback, setFeedback] = useFeedback()
  const [modalError, setModalError] = useState(null)

  const loadSemaforo = useCallback(async () => {
    setLoadingSemaforo(true)
    try {
      const res = await getRecetasSemaforo()
      setRecetasSemaforo(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setFeedback({
        type: 'error',
        msg: e.response?.data?.detail || 'Error al cargar recetas y costes',
      })
    } finally {
      setLoadingSemaforo(false)
    }
  }, [setFeedback])

  const loadArticulosYProductos = useCallback(async () => {
    try {
      const [artRes, prodRes] = await Promise.all([
        getArticulosInventario(),
        getAdminProductos(),
      ])
      setArticulos(Array.isArray(artRes.data) ? artRes.data : [])
      setProductos(Array.isArray(prodRes.data) ? prodRes.data : [])
    } catch {
      setArticulos([])
      setProductos([])
    }
  }, [])

  useEffect(() => {
    loadSemaforo()
    loadArticulosYProductos()
  }, [loadSemaforo, loadArticulosYProductos])

  const conteos = useMemo(() => {
    let v = 0
    let a = 0
    let r = 0
    for (const row of recetasSemaforo) {
      if (row.semaforo === 'verde') v += 1
      else if (row.semaforo === 'amarillo') a += 1
      else if (row.semaforo === 'rojo') r += 1
    }
    return { verde: v, amarillo: a, rojo: r }
  }, [recetasSemaforo])

  const cardsFiltradas = useMemo(() => {
    if (filtroColor === 'todos') return recetasSemaforo
    return recetasSemaforo.filter((row) => row.semaforo === filtroColor)
  }, [recetasSemaforo, filtroColor])

  const productosSinReceta = useMemo(
    () => productos.filter((p) => p.tiene_receta === false && p.activo !== false),
    [productos]
  )

  const articulosOrdenados = useMemo(() => {
    return [...articulos].sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', {
        sensitivity: 'base',
      })
    )
  }, [articulos])

  const openDetalle = async (recetaId) => {
    setModalDetalle(true)
    setModalError(null)
    setLoadingDetalle(true)
    try {
      const res = await getRecetaCoste(recetaId)
      setRecetaDetalle(res.data)
      setInstruccionesDraft(res.data?.instrucciones || '')
    } catch (e) {
      setModalError(
        e.response?.data?.detail || 'No se pudo cargar el detalle de la receta'
      )
      setRecetaDetalle(null)
    } finally {
      setLoadingDetalle(false)
    }
  }

  const reloadCoste = async (recetaId) => {
    try {
      const res = await getRecetaCoste(recetaId)
      setRecetaDetalle(res.data)
      setInstruccionesDraft(res.data?.instrucciones || '')
      await loadSemaforo()
    } catch (e) {
      setFeedback({
        type: 'error',
        msg: e.response?.data?.detail || 'Error al actualizar coste',
      })
    }
  }

  const handleCardClick = (row) => {
    if (row.receta_id) {
      openDetalle(row.receta_id)
    } else {
      setFormCrear((f) => ({
        ...f,
        producto_id: row.producto_id,
        rendimiento: '1',
        instrucciones: '',
      }))
      setModalCrear(true)
    }
  }

  const handleDeleteIng = async (ingId) => {
    if (!recetaDetalle?.receta_id) return
    if (!window.confirm('¿Eliminar este ingrediente?')) return
    try {
      await deleteIngredienteReceta(recetaDetalle.receta_id, ingId)
      setFeedback({ type: 'success', msg: 'Ingrediente eliminado' })
      await reloadCoste(recetaDetalle.receta_id)
    } catch (e) {
      setFeedback({
        type: 'error',
        msg: e.response?.data?.detail || 'Error al eliminar',
      })
    }
  }

  const handleAddIngrediente = async () => {
    if (!recetaDetalle?.receta_id) return
    setLoadingAddIngrediente(true)
    setModalError(null)
    try {
      const neta = Number(formIngrediente.cantidad_neta)
      const merma = Number(formIngrediente.porcentaje_merma)
      if (!formIngrediente.articulo_id) {
        setModalError('Selecciona un artículo')
        return
      }
      if (Number.isNaN(neta) || neta <= 0) {
        setModalError('Cantidad neta no válida')
        return
      }
      if (Number.isNaN(merma) || merma < 0 || merma >= 99) {
        setModalError('% merma entre 0 y 99')
        return
      }
      await addIngredienteReceta(recetaDetalle.receta_id, {
        articulo_id: formIngrediente.articulo_id,
        cantidad_neta: neta,
        porcentaje_merma: merma,
        unidad: formIngrediente.unidad,
      })
      setFormIngrediente({
        articulo_id: '',
        cantidad_neta: '',
        porcentaje_merma: '0',
        unidad: formIngrediente.unidad,
      })
      setModalError(null)
      setFeedback({ type: 'success', msg: 'Ingrediente añadido' })
      await reloadCoste(recetaDetalle.receta_id)
    } catch (e) {
      setModalError(
        e.response?.data?.detail || 'No se pudo añadir el ingrediente'
      )
    } finally {
      setLoadingAddIngrediente(false)
    }
  }

  const handleGuardarInstrucciones = async () => {
    if (!recetaDetalle?.receta_id) return
    setSavingInstrucciones(true)
    try {
      await updateReceta(recetaDetalle.receta_id, {
        instrucciones: instruccionesDraft || null,
      })
      setFeedback({ type: 'success', msg: 'Instrucciones guardadas' })
      await reloadCoste(recetaDetalle.receta_id)
    } catch (e) {
      setFeedback({
        type: 'error',
        msg: e.response?.data?.detail || 'Error al guardar',
      })
    } finally {
      setSavingInstrucciones(false)
    }
  }

  const handleCrearReceta = async () => {
    setModalError(null)
    try {
      if (!formCrear.producto_id) {
        setModalError('Selecciona un producto')
        return
      }
      const rend = Number(formCrear.rendimiento)
      if (Number.isNaN(rend) || rend <= 0) {
        setModalError('Rendimiento no válido')
        return
      }
      const res = await createReceta({
        producto_id: formCrear.producto_id,
        rendimiento: rend,
        tiempo_preparacion: null,
        instrucciones: formCrear.instrucciones.trim() || null,
      })
      const newId = res.data?.id
      setModalCrear(false)
      setFormCrear({ producto_id: '', rendimiento: '1', instrucciones: '' })
      setFeedback({ type: 'success', msg: 'Receta creada' })
      await loadSemaforo()
      await loadArticulosYProductos()
      if (newId) {
        await openDetalle(String(newId))
      }
    } catch (e) {
      setModalError(
        e.response?.data?.detail || 'No se pudo crear la receta'
      )
    }
  }

  const onSelectArticulo = (id) => {
    const art = articulos.find((a) => String(a.id) === String(id))
    setFormIngrediente((f) => ({
      ...f,
      articulo_id: id,
      unidad: art?.unidad_medida && UNIDADES_OPTS.includes(art.unidad_medida)
        ? art.unidad_medida
        : f.unidad || 'kg',
    }))
  }

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[#111827] dark:text-[#e8eaf0]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <ChefHat
            size={32}
            strokeWidth={1.5}
            className="text-amber-500"
            aria-hidden
          />
          <h1 className="text-2xl font-bold">Recetas y costes</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalError(null)
            setFormCrear({
              producto_id: productosSinReceta[0]?.id || '',
              rendimiento: '1',
              instrucciones: '',
            })
            setModalCrear(true)
          }}
          className={`flex h-12 items-center justify-center gap-2 self-end sm:self-auto ${BTN_PRIMARY}`}
        >
          <Plus size={20} strokeWidth={1.5} />
          Nueva receta
        </button>
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-[15px] ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {feedback.msg}
        </div>
      ) : null}

      <details className="mb-6 rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <summary className="cursor-pointer text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Ingredientes del almacén — precios de compra (referencia)
        </summary>
        <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          Lista de artículos con coste unitario en inventario. Úsala para
          contrastar con el desglose de cada receta al abrir un plato.
        </p>
        <div className="mt-3 max-h-56 overflow-y-auto overflow-x-auto rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
          <table className="w-full min-w-[480px] text-left text-[14px]">
            <thead className="sticky top-0 bg-[#f0f2f5] dark:bg-[#222536]">
              <tr>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Artículo
                </th>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  SKU
                </th>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Unidad
                </th>
                <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                  Precio / ud.
                </th>
              </tr>
            </thead>
            <tbody>
              {articulosOrdenados.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-[#e2e5ed] dark:border-[#2e3347]"
                >
                  <td className="px-3 py-2">{a.nombre || '—'}</td>
                  <td className="px-3 py-2 text-[#6b7280] dark:text-[#8b90a7]">
                    {a.sku || '—'}
                  </td>
                  <td className="px-3 py-2">{a.unidad_medida || '—'}</td>
                  <td className="px-3 py-2 font-medium">
                    {formatEuro(a.coste_unitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mb-6 flex flex-wrap gap-3">
        <span
          className="inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-500"
        >
          Verde {conteos.verde} platos
        </span>
        <span
          className="inline-flex items-center rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-500"
        >
          Amarillo {conteos.amarillo} platos
        </span>
        <span
          className="inline-flex items-center rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500"
        >
          Rojo {conteos.rojo} platos
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'verde', label: 'Verde' },
          { id: 'amarillo', label: 'Amarillo' },
          { id: 'rojo', label: 'Rojo' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltroColor(f.id)}
            className={`h-10 rounded-lg px-4 text-[15px] font-medium transition-colors ${
              filtroColor === f.id
                ? 'bg-amber-500 text-black'
                : 'border border-[#e2e5ed] bg-[#f0f2f5] text-[#6b7280] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#8b90a7]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadingSemaforo ? (
        <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Cargando…
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cardsFiltradas.map((row) => {
            const meta = semaforoMeta(row.semaforo)
            const precio =
              row.precio_venta ?? row.precio ?? 0
            const coste =
              row.coste_calculado ?? row.coste ?? null
            const margen = row.margen_porcentaje
            const hoverBorder =
              row.semaforo === 'verde'
                ? 'hover:border-emerald-500'
                : row.semaforo === 'amarillo'
                  ? 'hover:border-amber-500'
                  : row.semaforo === 'rojo'
                    ? 'hover:border-red-500'
                    : 'hover:border-zinc-400 dark:hover:border-zinc-500'
            return (
              <button
                key={`${row.producto_id}-${row.receta_id || 'nr'}`}
                type="button"
                onClick={() => handleCardClick(row)}
                className={`${CARD_BASE} border-2 text-left shadow-sm hover:scale-[1.01] hover:shadow-md ${hoverBorder}`}
              >
                <div className={`mb-3 h-1.5 w-full rounded-full ${meta.bar}`} />
                <p className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                  {row.producto_nombre}
                </p>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Venta: {formatEuro(precio)}
                </p>
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Coste:{' '}
                  {coste != null ? formatEuro(coste) : '—'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-2xl font-bold ${margen != null ? meta.text : 'text-[#6b7280] dark:text-[#8b90a7]'}`}
                  >
                    {margen != null ? `${Number(margen).toFixed(1)}%` : '—'}
                  </span>
                  {margen != null && Number(margen) >= 40 ? (
                    <TrendingUp
                      size={20}
                      strokeWidth={1.5}
                      className={meta.text}
                      aria-hidden
                    />
                  ) : margen != null ? (
                    <TrendingDown
                      size={20}
                      strokeWidth={1.5}
                      className={meta.text}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
                    aria-hidden
                  />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal detalle */}
      {modalDetalle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="absolute inset-0"
            role="presentation"
            onClick={() => setModalDetalle(false)}
            onKeyDown={(e) => e.key === 'Escape' && setModalDetalle(false)}
          />
          <div
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
                    {recetaDetalle?.producto_nombre || 'Receta'}
                  </h2>
                  {recetaDetalle?.semaforo ? (
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${semaforoMeta(recetaDetalle.semaforo).badge}`}
                    >
                      {semaforoMeta(recetaDetalle.semaforo).label}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  <span>
                    Precio venta:{' '}
                    <strong className="text-[#111827] dark:text-[#e8eaf0]">
                      {formatEuro(recetaDetalle?.precio_venta)}
                    </strong>
                  </span>
                  <span>
                    Coste total:{' '}
                    <strong className="text-[#111827] dark:text-[#e8eaf0]">
                      {formatEuro(
                        recetaDetalle?.coste_total ?? recetaDetalle?.coste
                      )}
                    </strong>
                  </span>
                  <span>
                    Margen:{' '}
                    <strong
                      className={
                        recetaDetalle?.semaforo
                          ? semaforoMeta(recetaDetalle.semaforo).text
                          : ''
                      }
                    >
                      {recetaDetalle?.margen_porcentaje != null
                        ? `${Number(recetaDetalle.margen_porcentaje).toFixed(2)}%`
                        : '—'}
                    </strong>
                  </span>
                  <span>
                    Rendimiento:{' '}
                    <strong className="text-[#111827] dark:text-[#e8eaf0]">
                      {Number(recetaDetalle?.rendimiento) > 0
                        ? Number(recetaDetalle.rendimiento).toFixed(2)
                        : '—'}{' '}
                      raciones / preparación
                    </strong>
                  </span>
                  <span
                    title="Coste total de ingredientes dividido entre el rendimiento de la receta."
                  >
                    Coste estimado por ración:{' '}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {(() => {
                        const rd = Number(recetaDetalle?.rendimiento) || 0
                        const ct = Number(
                          recetaDetalle?.coste_total ??
                            recetaDetalle?.coste
                        )
                        if (rd <= 0 || Number.isNaN(ct)) return '—'
                        return formatEuro(ct / rd)
                      })()}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalle(false)}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
                aria-label="Cerrar"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {modalError ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={18} strokeWidth={1.5} />
                {modalError}
              </div>
            ) : null}

            {loadingDetalle ? (
              <p className="text-[#6b7280] dark:text-[#8b90a7]">Cargando…</p>
            ) : recetaDetalle ? (
              <>
                <RecetaDetalleIngredientesSection
                  recetaDetalle={recetaDetalle}
                  formIngrediente={formIngrediente}
                  setFormIngrediente={setFormIngrediente}
                  articulos={articulos}
                  onSelectArticulo={onSelectArticulo}
                  onReloadCoste={reloadCoste}
                  onAddIngrediente={handleAddIngrediente}
                  onDeleteIngrediente={handleDeleteIng}
                  loadingAddIngrediente={loadingAddIngrediente}
                />

                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                    <Edit size={20} strokeWidth={1.5} className="text-amber-500" />
                    Instrucciones
                  </h4>
                  <textarea
                    value={instruccionesDraft}
                    onChange={(e) => setInstruccionesDraft(e.target.value)}
                    rows={5}
                    className={`${INPUT} mb-3 resize-y`}
                    placeholder="Pasos de elaboración…"
                  />
                  <button
                    type="button"
                    disabled={savingInstrucciones}
                    onClick={handleGuardarInstrucciones}
                    className={`flex items-center gap-2 ${BTN_PRIMARY}`}
                  >
                    <Save size={20} strokeWidth={1.5} />
                    Guardar instrucciones
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Modal crear */}
      {modalCrear ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="absolute inset-0"
            role="presentation"
            onClick={() => setModalCrear(false)}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nueva receta</h2>
              <button
                type="button"
                onClick={() => setModalCrear(false)}
                className="rounded-lg p-2 hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
                aria-label="Cerrar"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            {modalError ? (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">
                {modalError}
              </div>
            ) : null}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Producto (sin receta)
                </label>
                <select
                  value={formCrear.producto_id}
                  onChange={(e) =>
                    setFormCrear((f) => ({ ...f, producto_id: e.target.value }))
                  }
                  className={INPUT}
                >
                  <option value="">Seleccionar…</option>
                  {productosSinReceta.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Rendimiento
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formCrear.rendimiento}
                  onChange={(e) =>
                    setFormCrear((f) => ({
                      ...f,
                      rendimiento: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  Instrucciones (opcional)
                </label>
                <textarea
                  value={formCrear.instrucciones}
                  onChange={(e) =>
                    setFormCrear((f) => ({
                      ...f,
                      instrucciones: e.target.value,
                    }))
                  }
                  rows={4}
                  className={`${INPUT} resize-y`}
                />
              </div>
              <button
                type="button"
                onClick={handleCrearReceta}
                className={`w-full ${BTN_PRIMARY}`}
              >
                Crear receta
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
