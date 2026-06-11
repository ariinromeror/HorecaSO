import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Layers, Plus, Trash2, Wallet } from 'lucide-react'
import {
  addIngredienteReceta,
  createElaboracion,
  createRecetaPlatoNuevo,
  deleteIngredienteReceta,
  getAdminCategorias,
  getArticulosInventario,
  getRecetaCoste,
  getRecetas,
  updateReceta,
} from '../../../services/api'
import RecetaDetalleIngredientesSection from './RecetaDetalleIngredientesSection'
import {
  formatEuro,
  precioVentaSugerido,
  readPctCosteVenta,
  writePctCosteVenta,
} from './recetasUtils'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 font-semibold text-black hover:bg-amber-600 disabled:opacity-40'

const UNIDAD_SALIDA_OPTS = [
  { value: 'kg', label: 'kg (kilogramos)' },
  { value: 'g', label: 'g (gramos)' },
  { value: 'L', label: 'L (litros)' },
  { value: 'ml', label: 'ml (mililitros)' },
  { value: 'ud', label: 'ud (unidades)' },
  { value: 'bot', label: 'bot (botellas)' },
]

export default function ElaboracionesPage() {
  const [lista, setLista] = useState([])
  const [articulos, setArticulos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [formErr, setFormErr] = useState(null)
  const [savingBase, setSavingBase] = useState(false)
  const [loadingAddIngrediente, setLoadingAddIngrediente] = useState(false)
  const [editingRecetaId, setEditingRecetaId] = useState(null)
  const [modoCreacion, setModoCreacion] = useState('plato')
  const [pctCosteVenta, setPctCosteVenta] = useState(() =>
    readPctCosteVenta()
  )
  const [form, setForm] = useState({
    nombre: '',
    categoria_id: '',
    unidad_medida: 'kg',
    rendimiento: '1',
    instrucciones: '',
  })
  const [formIngrediente, setFormIngrediente] = useState({
    articulo_id: '',
    cantidad_neta: '',
    porcentaje_merma: '0',
    unidad: 'kg',
  })
  /** Líneas a enviar al crear la receta (misma tarjeta que el formulario base). */
  const [ingredientesPendientes, setIngredientesPendientes] = useState([])
  const [lineaNueva, setLineaNueva] = useState({
    articulo_id: '',
    cantidad_neta: '',
    unidad: 'kg',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [recetasRes, articulosRes, catRes] = await Promise.all([
        getRecetas(),
        getArticulosInventario(),
        getAdminCategorias(),
      ])
      setLista(Array.isArray(recetasRes.data) ? recetasRes.data : [])
      setArticulos(Array.isArray(articulosRes.data) ? articulosRes.data : [])
      const cats = Array.isArray(catRes.data) ? catRes.data : []
      setCategorias(
        [...cats].sort((a, b) =>
          String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', {
            sensitivity: 'base',
          })
        )
      )
    } catch (e) {
      setErr(e.response?.data?.detail || 'Error al cargar recetas')
      setLista([])
      setArticulos([])
      setCategorias([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const recetasOrdenadas = useMemo(
    () =>
      [...lista].sort((a, b) =>
        String(a.producto_nombre || '').localeCompare(
          String(b.producto_nombre || ''),
          'es',
          { sensitivity: 'base' }
        )
      ),
    [lista]
  )

  const articulosOrdenados = useMemo(
    () =>
      [...articulos].sort((a, b) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', {
          sensitivity: 'base',
        })
      ),
    [articulos]
  )

  const loadDetalle = useCallback(async (recetaId) => {
    const res = await getRecetaCoste(recetaId)
    const d = res.data
    setDetalle(d)
    setEditingRecetaId(String(recetaId))
    setModoCreacion(d.es_elaboracion ? 'elaboracion' : 'plato')
    setForm((f) => ({
      ...f,
      rendimiento:
        d.rendimiento != null ? String(d.rendimiento) : f.rendimiento,
      instrucciones: d.instrucciones || '',
    }))
  }, [])

  const recetaParam = searchParams.get('receta')
  useEffect(() => {
    if (!recetaParam) return
    let cancelled = false
    void (async () => {
      try {
        await loadDetalle(recetaParam)
        if (!cancelled) setSearchParams({}, { replace: true })
      } catch (e) {
        if (!cancelled) {
          setFormErr(
            e.response?.data?.detail || 'No se pudo cargar la receta'
          )
          setSearchParams({}, { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [recetaParam, loadDetalle, setSearchParams])

  const resetEditor = () => {
    setEditingRecetaId(null)
    setDetalle(null)
    setFormErr(null)
    setModoCreacion('plato')
    setForm({
      nombre: '',
      categoria_id: '',
      unidad_medida: 'kg',
      rendimiento: '1',
      instrucciones: '',
    })
    setFormIngrediente({
      articulo_id: '',
      cantidad_neta: '',
      porcentaje_merma: '0',
      unidad: 'kg',
    })
    setIngredientesPendientes([])
    setLineaNueva({ articulo_id: '', cantidad_neta: '', unidad: 'kg' })
  }

  const onSelectLineaNuevaArticulo = (id) => {
    if (!id) {
      setLineaNueva((f) => ({ ...f, articulo_id: '', unidad: 'kg' }))
      return
    }
    const art = articulos.find((a) => String(a.id) === String(id))
    const um = String(art?.unidad_medida || 'kg').toLowerCase()
    setLineaNueva((f) => ({
      ...f,
      articulo_id: id,
      unidad: um || 'kg',
    }))
  }

  const handleAnadirIngredientePendiente = () => {
    setFormErr(null)
    const neta = Number(String(lineaNueva.cantidad_neta).replace(',', '.'))
    if (!lineaNueva.articulo_id) {
      setFormErr('Elige un ingrediente del inventario')
      return
    }
    if (Number.isNaN(neta) || neta <= 0) {
      setFormErr('Indica una cantidad neta mayor que cero')
      return
    }
    if (
      ingredientesPendientes.some(
        (p) => String(p.articulo_id) === String(lineaNueva.articulo_id)
      )
    ) {
      setFormErr('Ese artículo ya está en la lista; quítalo antes o elige otro')
      return
    }
    const art = articulos.find(
      (a) => String(a.id) === String(lineaNueva.articulo_id)
    )
    setIngredientesPendientes((prev) => [
      ...prev,
      {
        key: `${lineaNueva.articulo_id}-${Date.now()}`,
        articulo_id: lineaNueva.articulo_id,
        cantidad_neta: neta,
        unidad: lineaNueva.unidad,
        articulo_nombre: art?.nombre || 'Artículo',
      },
    ])
    setLineaNueva({ articulo_id: '', cantidad_neta: '', unidad: 'kg' })
  }

  const handleQuitarIngredientePendiente = (key) => {
    setIngredientesPendientes((prev) => prev.filter((p) => p.key !== key))
  }

  /** Si hay artículo+cantidad en el desplegable sin pulsar "Añadir línea", se incluyen al guardar. */
  const incorporarLineaNuevaSiValida = () => {
    const neta = Number(String(lineaNueva.cantidad_neta).replace(',', '.'))
    if (!lineaNueva.articulo_id || Number.isNaN(neta) || neta <= 0) {
      return []
    }
    if (
      ingredientesPendientes.some(
        (p) => String(p.articulo_id) === String(lineaNueva.articulo_id)
      )
    ) {
      return []
    }
    const art = articulos.find(
      (a) => String(a.id) === String(lineaNueva.articulo_id)
    )
    return [
      {
        key: `${lineaNueva.articulo_id}-flush`,
        articulo_id: lineaNueva.articulo_id,
        cantidad_neta: neta,
        unidad: lineaNueva.unidad,
        articulo_nombre: art?.nombre || 'Artículo',
      },
    ]
  }

  const handleGuardarBase = async () => {
    setFormErr(null)
    const rend = Number(String(form.rendimiento).replace(',', '.'))
    if (Number.isNaN(rend) || rend <= 0) {
      setFormErr('Cantidad de salida no válida')
      return
    }

    setSavingBase(true)
    try {
      if (editingRecetaId) {
        await updateReceta(editingRecetaId, {
          rendimiento: rend,
          instrucciones: form.instrucciones.trim() || null,
        })
        await loadDetalle(editingRecetaId)
        await load()
        return
      }

      let res
      if (modoCreacion === 'plato') {
        const nombre = form.nombre.trim()
        if (!nombre) {
          setFormErr('Indica el nombre del plato')
          return
        }
        const body = {
          nombre,
          rendimiento: rend,
          tiempo_preparacion: null,
          instrucciones: form.instrucciones.trim() || null,
        }
        if (form.categoria_id) {
          body.categoria_id = form.categoria_id
        }
        res = await createRecetaPlatoNuevo(body)
      } else {
        const nombre = form.nombre.trim()
        if (!nombre) {
          setFormErr('Indica un nombre para la elaboración')
          return
        }
        res = await createElaboracion({
          nombre,
          unidad_medida: form.unidad_medida || 'kg',
          rendimiento: rend,
          tiempo_preparacion: null,
          instrucciones: form.instrucciones.trim() || null,
        })
      }

      const id = res?.data?.id
      const extra = incorporarLineaNuevaSiValida()
      const lineasAGuardar = [...ingredientesPendientes, ...extra]
      if (id && lineasAGuardar.length > 0) {
        for (const line of lineasAGuardar) {
          await addIngredienteReceta(id, {
            articulo_id: line.articulo_id,
            cantidad_neta: line.cantidad_neta,
            porcentaje_merma: 0,
            unidad: line.unidad,
          })
        }
        setIngredientesPendientes([])
        setLineaNueva({ articulo_id: '', cantidad_neta: '', unidad: 'kg' })
      }
      if (id) {
        await loadDetalle(id)
      }
      await load()
    } catch (e) {
      setFormErr(
        e.response?.data?.detail || 'No se pudo guardar receta/elaboración'
      )
    } finally {
      setSavingBase(false)
    }
  }

  const onSelectArticulo = (id) => {
    const art = articulos.find((a) => String(a.id) === String(id))
    const um = String(art?.unidad_medida || 'kg').toLowerCase()
    setFormIngrediente((f) => ({ ...f, articulo_id: id, unidad: um || 'kg' }))
  }

  const handleAddIngrediente = async () => {
    if (!editingRecetaId) {
      setFormErr('Primero crea o selecciona una receta')
      return
    }
    const neta = Number(formIngrediente.cantidad_neta)
    if (!formIngrediente.articulo_id || Number.isNaN(neta) || neta <= 0) {
      setFormErr('Selecciona ingrediente y cantidad válida')
      return
    }

    setLoadingAddIngrediente(true)
    try {
      await addIngredienteReceta(editingRecetaId, {
        articulo_id: formIngrediente.articulo_id,
        cantidad_neta: neta,
        porcentaje_merma: 0,
        unidad: formIngrediente.unidad,
      })
      setFormIngrediente((f) => ({ ...f, articulo_id: '', cantidad_neta: '' }))
      await loadDetalle(editingRecetaId)
      await load()
      setFormErr(null)
    } catch (e) {
      setFormErr(e.response?.data?.detail || 'No se pudo añadir ingrediente')
    } finally {
      setLoadingAddIngrediente(false)
    }
  }

  const handleDeleteIngrediente = async (ingredienteId) => {
    if (!editingRecetaId) return
    try {
      await deleteIngredienteReceta(editingRecetaId, ingredienteId)
      await loadDetalle(editingRecetaId)
      await load()
    } catch (e) {
      setFormErr(e.response?.data?.detail || 'No se pudo eliminar ingrediente')
    }
  }

  const costeNum = detalle
    ? Number(detalle.coste_total ?? detalle.coste ?? 0)
    : null
  const pvpSugerido =
    costeNum != null && costeNum > 0
      ? precioVentaSugerido(costeNum, pctCosteVenta)
      : null

  const onPctChange = (e) => {
    const v = e.target.value
    const n = Number(String(v).replace(',', '.'))
    setPctCosteVenta(Number.isFinite(n) ? n : pctCosteVenta)
    if (Number.isFinite(n) && n > 0 && n < 100) {
      writePctCosteVenta(n)
    }
  }

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[#111827] dark:text-[#e8eaf0]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Layers
            size={32}
            strokeWidth={1.5}
            className="shrink-0 text-amber-500"
            aria-hidden
          />
          <div>
            <h1 className="text-2xl font-bold">Editor simple de recetas</h1>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Crea un plato nuevo en carta o una elaboración, añade ingredientes
              y revisa el coste. El precio de venta se define después en carta.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-end sm:self-auto">
          <Link
            to="/admin/recetas"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-4 font-medium dark:border-[#2e3347]"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
            Recetas de carta
          </Link>
          <Link
            to="/admin/costes"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-4 font-medium dark:border-[#2e3347]"
          >
            <Wallet size={20} strokeWidth={1.5} />
            Gastos operativos
          </Link>
        </div>
      </div>

      <div className={CARD}>
        <div className="mb-3 flex items-center gap-2">
          <Plus className="text-amber-500" size={22} strokeWidth={1.5} />
          <h2 className="text-lg font-semibold">
            {editingRecetaId ? 'Datos de la receta' : 'Nueva receta'}
          </h2>
        </div>
        {formErr ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {formErr}
          </div>
        ) : null}
        <div className="space-y-3">
          {!editingRecetaId ? (
            <div>
              <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                Tipo
              </label>
              <select
                className={INPUT}
                value={modoCreacion}
                onChange={(e) => setModoCreacion(e.target.value)}
              >
                <option value="plato">Plato nuevo (aparece en carta, precio 0)</option>
                <option value="elaboracion">Solo elaboración (sub-receta)</option>
              </select>
            </div>
          ) : (
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Editando:{' '}
              <strong className="text-[#111827] dark:text-[#e8eaf0]">
                {detalle?.producto_nombre || '—'}
              </strong>
              {detalle?.es_elaboracion ? (
                <span className="ml-2 rounded bg-[#f0f2f5] px-2 py-0.5 text-xs dark:bg-[#222536]">
                  Elaboración
                </span>
              ) : (
                <span className="ml-2 rounded bg-[#f0f2f5] px-2 py-0.5 text-xs dark:bg-[#222536]">
                  Plato en carta
                </span>
              )}
            </p>
          )}

          {!editingRecetaId && modoCreacion === 'plato' ? (
            <>
              <div>
                <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  Nombre del plato
                </label>
                <input
                  className={INPUT}
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  placeholder="Ej. Ensalada césar"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  Categoría en carta (opcional)
                </label>
                <select
                  className={INPUT}
                  value={form.categoria_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoria_id: e.target.value }))
                  }
                >
                  <option value="">Primera categoría por orden</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          {!editingRecetaId && modoCreacion === 'elaboracion' ? (
            <>
              <div>
                <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  Nombre
                </label>
                <input
                  className={INPUT}
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  placeholder="Ej. Salsa tártara"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  Unidad de salida
                </label>
                <select
                  className={INPUT}
                  value={form.unidad_medida}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unidad_medida: e.target.value }))
                  }
                >
                  {UNIDAD_SALIDA_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
              Cantidad de salida (rendimiento)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={INPUT}
              value={form.rendimiento}
              onChange={(e) =>
                setForm((f) => ({ ...f, rendimiento: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
              Descripción / instrucciones
            </label>
            <textarea
              rows={3}
              className={`${INPUT} resize-y`}
              value={form.instrucciones}
              onChange={(e) =>
                setForm((f) => ({ ...f, instrucciones: e.target.value }))
              }
            />
          </div>

          {!editingRecetaId ? (
            <div className="rounded-lg border border-[#e2e5ed] bg-[#f9fafb] p-4 dark:border-[#2e3347] dark:bg-[#222536]">
              <p className="mb-1 text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
                Ingredientes del inventario
              </p>
              <p className="mb-3 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                Elige artículo y cantidad y pulsa Guardar abajo, o usa «Añadir línea»
                para varios ingredientes antes de guardar.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 flex-1 sm:min-w-[220px]">
                  <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Artículo
                  </label>
                  <select
                    className={INPUT}
                    value={lineaNueva.articulo_id}
                    onChange={(e) =>
                      onSelectLineaNuevaArticulo(e.target.value)
                    }
                  >
                    <option value="">Selecciona del inventario…</option>
                    {articulosOrdenados.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                        {a.sku ? ` (${a.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-32">
                  <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Cantidad (neta)
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    className={INPUT}
                    value={lineaNueva.cantidad_neta}
                    onChange={(e) =>
                      setLineaNueva((f) => ({
                        ...f,
                        cantidad_neta: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="w-full sm:w-28">
                  <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                    Unidad
                  </label>
                  <input
                    className={`${INPUT} cursor-not-allowed opacity-90`}
                    readOnly
                    value={lineaNueva.unidad}
                    title="Unidad del artículo en inventario"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAnadirIngredientePendiente}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-500/25 dark:text-amber-200"
                >
                  Añadir línea
                </button>
              </div>
              {ingredientesPendientes.length > 0 ? (
                <ul className="mt-3 space-y-2 border-t border-[#e2e5ed] pt-3 dark:border-[#2e3347]">
                  {ingredientesPendientes.map((p) => (
                    <li
                      key={p.key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        <strong>{p.articulo_nombre}</strong>{' '}
                        <span className="text-[#6b7280] dark:text-[#8b90a7]">
                          {p.cantidad_neta} {p.unidad}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuitarIngredientePendiente(p.key)}
                        className="rounded p-1 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        aria-label="Quitar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingBase}
              onClick={handleGuardarBase}
              className={BTN}
            >
              <Plus size={20} strokeWidth={1.5} />
              {editingRecetaId ? 'Guardar cambios' : 'Guardar'}
            </button>
            {editingRecetaId ? (
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-[#e2e5ed] px-4 font-medium dark:border-[#2e3347]"
                onClick={resetEditor}
              >
                Nuevo formulario
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {detalle ? (
        <div className={`mt-6 ${CARD}`}>
          <div className="mb-4 flex flex-col gap-3 border-b border-[#e2e5ed] pb-4 dark:border-[#2e3347] sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Ingredientes: {detalle.producto_nombre || 'Receta'}
              </h3>
              <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Coste total:{' '}
                <strong className="text-amber-600 dark:text-amber-400">
                  {formatEuro(detalle.coste_total ?? detalle.coste)}
                </strong>
              </p>
            </div>
            <div className="rounded-lg border border-[#e2e5ed] bg-[#f9fafb] p-3 text-sm dark:border-[#2e3347] dark:bg-[#222536]">
              <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                % coste sobre venta (objetivo)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="0.5"
                  className="w-24 rounded border border-[#e2e5ed] bg-white px-2 py-1 dark:border-[#2e3347] dark:bg-[#1a1d27]"
                  value={pctCosteVenta}
                  onChange={onPctChange}
                />
                <span className="text-[#6b7280] dark:text-[#8b90a7]">%</span>
              </div>
              {pvpSugerido != null ? (
                <p className="mt-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
                  PVP sugerido: {formatEuro(pvpSugerido)}
                </p>
              ) : (
                <p className="mt-2 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  Añade ingredientes con coste para ver el PVP sugerido.
                </p>
              )}
              {!detalle.es_elaboracion ? (
                <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  El precio real se edita en Carta cuando quieras publicarlo.
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  Referencia interna; las elaboraciones no tienen PVP en carta.
                </p>
              )}
            </div>
          </div>
          <RecetaDetalleIngredientesSection
            recetaDetalle={detalle}
            formIngrediente={formIngrediente}
            setFormIngrediente={setFormIngrediente}
            articulos={articulos}
            onSelectArticulo={onSelectArticulo}
            onReloadCoste={loadDetalle}
            onAddIngrediente={handleAddIngrediente}
            onDeleteIngrediente={handleDeleteIngrediente}
            loadingAddIngrediente={loadingAddIngrediente}
          />
        </div>
      ) : null}

      <div className={`mt-6 ${CARD}`}>
        <h2 className="mb-4 text-lg font-semibold">
          Recetas y elaboraciones
          {!loading ? (
            <span className="ml-2 text-sm font-normal text-[#6b7280] dark:text-[#8b90a7]">
              ({recetasOrdenadas.length})
            </span>
          ) : null}
        </h2>
        {loading ? (
          <p className="text-[#6b7280] dark:text-[#8b90a7]">Cargando…</p>
        ) : err ? (
          <p className="text-red-600 dark:text-red-400">{err}</p>
        ) : recetasOrdenadas.length === 0 ? (
          <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Aún no hay recetas ni elaboraciones.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
            <table className="horeca-body-text w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] bg-[#f0f2f5] dark:border-[#2e3347] dark:bg-[#222536]">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 text-right">Coste calc.</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recetasOrdenadas.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                  >
                    <td className="px-3 py-2 font-medium">
                      {row.producto_nombre || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {row.es_elaboracion ? 'Elaboración' : 'Plato'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.coste_calculado != null
                        ? formatEuro(row.coste_calculado)
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => loadDetalle(row.id)}
                        className="font-medium text-amber-600 hover:underline dark:text-amber-400"
                      >
                        Editar aquí
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
