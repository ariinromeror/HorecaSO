import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  Edit,
  Filter,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import {
  createAdminCategoria,
  createAdminProducto,
  deleteAdminCategoria,
  deleteAdminProducto,
  getAdminCategorias,
  getAdminProductos,
  getAlergenos,
  setProductoAlergenos,
  updateAdminCategoria,
  updateAdminProducto,
} from '../../services/api'

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
]

const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const BTN_DANGER =
  'h-10 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors'
const INPUT =
  'w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const CARD =
  'bg-white dark:bg-[#1a1d27] border border-[#e2e5ed] dark:border-[#2e3347] rounded-xl'

function useFeedback() {
  const [feedback, setFeedback] = useState(null)

  const show = useCallback((type, msg) => {
    setFeedback({ type, msg })
  }, [])

  useEffect(() => {
    if (!feedback) return undefined
    const t = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(t)
  }, [feedback])

  return { feedback, show, clear: () => setFeedback(null) }
}

function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full max-w-lg ${CARD} p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
            aria-label="Cerrar modal"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function CartaPage() {
  const [tab, setTab] = useState('categorias')
  const [modal, setModal] = useState('none')
  const [editingCategoria, setEditingCategoria] = useState(null)
  const [editingProducto, setEditingProducto] = useState(null)

  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [alergenosList, setAlergenosList] = useState([])

  const [loadingCat, setLoadingCat] = useState(false)
  const [loadingProd, setLoadingProd] = useState(false)
  const [errorCat, setErrorCat] = useState(null)
  const [errorProd, setErrorProd] = useState(null)

  const [filtroCategoriaId, setFiltroCategoriaId] = useState('')
  const [searchText, setSearchText] = useState('')

  const [alergenosSeleccion, setAlergenosSeleccion] = useState([])
  const [alergenosCache, setAlergenosCache] = useState({})

  const { feedback, show: showFeedback } = useFeedback()

  const [catForm, setCatForm] = useState({
    nombre: '',
    icono: '',
    color: '#f59e0b',
    orden: 0,
  })
  const [prodForm, setProdForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria_id: '',
    iva_porcentaje: '10',
    activo: true,
  })
  const [modalMsg, setModalMsg] = useState(null)

  const loadCategorias = useCallback(async () => {
    setLoadingCat(true)
    setErrorCat(null)
    try {
      const res = await getAdminCategorias()
      setCategorias(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setErrorCat(e.response?.data?.detail || 'Error al cargar categorías')
    } finally {
      setLoadingCat(false)
    }
  }, [])

  const loadProductos = useCallback(async () => {
    setLoadingProd(true)
    setErrorProd(null)
    try {
      const res = await getAdminProductos()
      setProductos(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setErrorProd(e.response?.data?.detail || 'Error al cargar productos')
    } finally {
      setLoadingProd(false)
    }
  }, [])

  const loadAlergenos = useCallback(async () => {
    try {
      const res = await getAlergenos()
      setAlergenosList(Array.isArray(res.data) ? res.data : [])
    } catch {
      setAlergenosList([])
    }
  }, [])

  useEffect(() => {
    loadCategorias()
    loadProductos()
    loadAlergenos()
  }, [loadCategorias, loadProductos, loadAlergenos])

  const categoriasOrdenadas = useMemo(() => {
    return [...categorias].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre)
    )
  }, [categorias])

  const productosFiltrados = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return productos.filter((p) => {
      if (filtroCategoriaId && String(p.categoria_id) !== String(filtroCategoriaId)) {
        return false
      }
      if (q && !String(p.nombre || '').toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [productos, filtroCategoriaId, searchText])

  const openCategoriaModal = (cat = null) => {
    setModalMsg(null)
    setEditingCategoria(cat)
    if (cat) {
      setCatForm({
        nombre: cat.nombre || '',
        icono: cat.icono || '',
        color: cat.color || '#f59e0b',
        orden: cat.orden ?? 0,
      })
    } else {
      setCatForm({
        nombre: '',
        icono: '',
        color: '#f59e0b',
        orden: 0,
      })
    }
    setModal('categoria')
  }

  const openProductoModal = (p = null) => {
    setModalMsg(null)
    setEditingProducto(p)
    if (p) {
      setProdForm({
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        precio: String(p.precio ?? ''),
        categoria_id: p.categoria_id || '',
        iva_porcentaje: String(
          p.iva_porcentaje === 21 || p.iva_porcentaje === 21.0 ? '21' : '10'
        ),
        activo: p.activo !== false,
      })
    } else {
      const firstCat = categoriasOrdenadas[0]
      setProdForm({
        nombre: '',
        descripcion: '',
        precio: '',
        categoria_id: firstCat ? String(firstCat.id) : '',
        iva_porcentaje: '10',
        activo: true,
      })
    }
    setModal('producto')
  }

  const openAlergenosModal = (p) => {
    setEditingProducto(p)
    setModalMsg(null)
    const cached = alergenosCache[p.id]
    setAlergenosSeleccion(
      cached ? cached.map((x) => Number(x)) : []
    )
    setModal('alergenos')
  }

  const toggleAlergeno = (id) => {
    const n = Number(id)
    setAlergenosSeleccion((prev) =>
      prev.some((x) => Number(x) === n)
        ? prev.filter((x) => Number(x) !== n)
        : [...prev, n]
    )
  }

  const submitCategoria = async () => {
    setModalMsg(null)
    try {
      const body = {
        nombre: catForm.nombre.trim(),
        icono: catForm.icono.trim() || null,
        color: catForm.color || null,
        orden: Number(catForm.orden) || 0,
      }
      if (!body.nombre) {
        setModalMsg({ type: 'error', text: 'El nombre es obligatorio' })
        return
      }
      if (editingCategoria) {
        await updateAdminCategoria(editingCategoria.id, body)
      } else {
        await createAdminCategoria(body)
      }
      await loadCategorias()
      showFeedback('success', editingCategoria ? 'Categoría actualizada' : 'Categoría creada')
      setModal('none')
    } catch (e) {
      const d = e.response?.data?.detail
      setModalMsg({
        type: 'error',
        text: typeof d === 'string' ? d : 'Error al guardar',
      })
    }
  }

  const submitProducto = async () => {
    setModalMsg(null)
    try {
      const nombre = prodForm.nombre.trim()
      if (!nombre) {
        setModalMsg({ type: 'error', text: 'El nombre es obligatorio' })
        return
      }
      if (!prodForm.categoria_id) {
        setModalMsg({ type: 'error', text: 'Selecciona una categoría' })
        return
      }
      const precio = Number(prodForm.precio)
      if (Number.isNaN(precio) || precio < 0) {
        setModalMsg({ type: 'error', text: 'Precio no válido' })
        return
      }
      const iva = Number(prodForm.iva_porcentaje)
      const base = {
        nombre,
        descripcion: prodForm.descripcion.trim() || null,
        precio,
        categoria_id: prodForm.categoria_id,
        iva_porcentaje: iva,
      }
      if (editingProducto) {
        await updateAdminProducto(editingProducto.id, {
          ...base,
          activo: prodForm.activo,
        })
        showFeedback('success', 'Producto actualizado')
      } else {
        const created = await createAdminProducto({
          ...base,
          es_bebida: false,
          tiene_receta: false,
          disponible_delivery: true,
          tiempo_preparacion: 0,
        })
        const newId = created.data?.id
        if (newId && !prodForm.activo) {
          await updateAdminProducto(newId, { activo: false })
        }
        showFeedback('success', 'Producto creado')
      }
      await loadProductos()
      setModal('none')
    } catch (e) {
      const d = e.response?.data?.detail
      setModalMsg({
        type: 'error',
        text: typeof d === 'string' ? d : 'Error al guardar producto',
      })
    }
  }

  const submitAlergenos = async () => {
    if (!editingProducto) return
    setModalMsg(null)
    try {
      await setProductoAlergenos(editingProducto.id, alergenosSeleccion)
      setAlergenosCache((prev) => ({
        ...prev,
        [editingProducto.id]: [...alergenosSeleccion],
      }))
      showFeedback('success', 'Alérgenos guardados')
      setModal('none')
    } catch (e) {
      const d = e.response?.data?.detail
      setModalMsg({
        type: 'error',
        text: typeof d === 'string' ? d : 'Error al guardar alérgenos',
      })
    }
  }

  const handleDeleteCategoria = async (cat) => {
    if (!window.confirm(`¿Desactivar categoría «${cat.nombre}»?`)) return
    try {
      await deleteAdminCategoria(cat.id)
      await loadCategorias()
      showFeedback('success', 'Categoría desactivada')
    } catch (e) {
      showFeedback('error', e.response?.data?.detail || 'Error al eliminar')
    }
  }

  const handleDeleteProducto = async (p) => {
    if (!window.confirm(`¿Desactivar producto «${p.nombre}»?`)) return
    try {
      await deleteAdminProducto(p.id)
      await loadProductos()
      showFeedback('success', 'Producto desactivado')
    } catch (e) {
      showFeedback('error', e.response?.data?.detail || 'Error al eliminar')
    }
  }

  const toggleProductoActivo = async (p) => {
    try {
      await updateAdminProducto(p.id, { activo: !p.activo })
      await loadProductos()
      showFeedback('success', !p.activo ? 'Producto activado' : 'Producto desactivado')
    } catch (e) {
      showFeedback('error', e.response?.data?.detail || 'Error al actualizar')
    }
  }

  return (
    <div className="min-h-full text-[#111827] dark:text-[#e8eaf0]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Carta del restaurante
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('categorias')}
            className={`flex h-12 items-center gap-2 rounded-lg px-4 text-[15px] font-medium transition-colors ${
              tab === 'categorias'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-500'
                : 'bg-[#f0f2f5] text-[#6b7280] dark:bg-[#222536] dark:text-[#8b90a7]'
            }`}
          >
            <Tag size={20} strokeWidth={1.5} />
            Categorías
          </button>
          <button
            type="button"
            onClick={() => setTab('productos')}
            className={`flex h-12 items-center gap-2 rounded-lg px-4 text-[15px] font-medium transition-colors ${
              tab === 'productos'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-500'
                : 'bg-[#f0f2f5] text-[#6b7280] dark:bg-[#222536] dark:text-[#8b90a7]'
            }`}
          >
            <BookOpen size={20} strokeWidth={1.5} />
            Productos
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-[15px] ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
          role="status"
        >
          {feedback.msg}
        </div>
      ) : null}

      {tab === 'categorias' ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => openCategoriaModal(null)}
              className={`flex h-12 items-center gap-2 px-6 ${BTN_PRIMARY}`}
            >
              <Plus size={20} strokeWidth={1.5} />
              Nueva categoría
            </button>
          </div>
          {errorCat ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[15px] text-red-600 dark:text-red-400">
              <AlertTriangle size={20} strokeWidth={1.5} />
              {errorCat}
            </div>
          ) : null}
          {loadingCat ? (
            <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
              Cargando categorías…
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoriasOrdenadas.map((cat) => (
                <div key={cat.id} className={`${CARD} p-5 shadow-sm`}>
                  <div className="flex gap-4">
                    <div
                      className="h-14 w-14 shrink-0 rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
                      style={{ backgroundColor: cat.color || '#f59e0b' }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        {cat.nombre}
                      </p>
                      <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                        Icono:{' '}
                        <span className="font-mono text-xs">
                          {cat.icono || '—'}
                        </span>
                      </p>
                      <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                        Orden: {cat.orden ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openCategoriaModal(cat)}
                      className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
                    >
                      <Edit size={18} strokeWidth={1.5} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategoria(cat)}
                      className={`flex h-10 items-center gap-1 ${BTN_DANGER}`}
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Filter
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
                  size={18}
                  strokeWidth={1.5}
                />
                <select
                  value={filtroCategoriaId}
                  onChange={(e) => setFiltroCategoriaId(e.target.value)}
                  className={`${INPUT} appearance-none pl-10 pr-10`}
                >
                  <option value="">Todas las categorías</option>
                  {categoriasOrdenadas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
                  size={18}
                  strokeWidth={1.5}
                />
              </div>
              <div className="relative flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
                  size={18}
                  strokeWidth={1.5}
                />
                <input
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className={`${INPUT} pl-10`}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => openProductoModal(null)}
              className={`flex h-12 shrink-0 items-center gap-2 px-6 ${BTN_PRIMARY}`}
            >
              <Plus size={20} strokeWidth={1.5} />
              Nuevo producto
            </button>
          </div>

          {errorProd ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[15px] text-red-600 dark:text-red-400">
              <AlertTriangle size={20} strokeWidth={1.5} />
              {errorProd}
            </div>
          ) : null}

          {loadingProd ? (
            <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
              Cargando productos…
            </p>
          ) : (
            <>
              {/* Móvil: cards */}
              <div className="space-y-3 md:hidden">
                {productosFiltrados.map((p) => (
                  <div key={p.id} className={`${CARD} p-4 shadow-sm`}>
                    <p className="text-[15px] font-semibold">{p.nombre}</p>
                    <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                      {p.categoria_nombre || '—'}
                    </p>
                    <p className="mt-2 text-[15px]">
                      {Number(p.precio).toFixed(2)} € · IVA {p.iva_porcentaje}%
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                        Activo
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.activo !== false}
                        onClick={() => toggleProductoActivo(p)}
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          p.activo !== false
                            ? 'bg-amber-500'
                            : 'bg-[#d1d5db] dark:bg-[#4b5563]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            p.activo !== false ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openProductoModal(p)}
                        className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                      >
                        <Edit size={18} strokeWidth={1.5} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => openAlergenosModal(p)}
                        className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                      >
                        Alérgenos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProducto(p)}
                        className={`flex h-10 items-center gap-1 ${BTN_DANGER}`}
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Escritorio: tabla */}
              <div className={`hidden overflow-x-auto md:block ${CARD} shadow-sm`}>
                <table className="w-full min-w-[640px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Nombre
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Categoría
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Precio
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        IVA
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Activo
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                      >
                        <td className="px-4 py-3 font-medium">{p.nombre}</td>
                        <td className="px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                          {p.categoria_nombre || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {Number(p.precio).toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">{p.iva_porcentaje}%</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={p.activo !== false}
                            onClick={() => toggleProductoActivo(p)}
                            className={`relative h-7 w-12 rounded-full transition-colors ${
                              p.activo !== false
                                ? 'bg-amber-500'
                                : 'bg-[#d1d5db] dark:bg-[#4b5563]'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                                p.activo !== false ? 'left-5' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openProductoModal(p)}
                              className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                            >
                              <Edit size={18} strokeWidth={1.5} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => openAlergenosModal(p)}
                              className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                            >
                              Alérgenos
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProducto(p)}
                              className={`flex h-10 items-center gap-1 ${BTN_DANGER}`}
                            >
                              <Trash2 size={18} strokeWidth={1.5} />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {modal === 'categoria' ? (
        <Modal
          title={editingCategoria ? 'Editar categoría' : 'Nueva categoría'}
          onClose={() => setModal('none')}
        >
          {modalMsg ? (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                modalMsg.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {modalMsg.text}
            </div>
          ) : null}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Nombre
              </label>
              <input
                type="text"
                value={catForm.nombre}
                onChange={(e) =>
                  setCatForm((s) => ({ ...s, nombre: e.target.value }))
                }
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Icono (texto / referencia)
              </label>
              <input
                type="text"
                value={catForm.icono}
                onChange={(e) =>
                  setCatForm((s) => ({ ...s, icono: e.target.value }))
                }
                className={INPUT}
                placeholder="Referencia almacenada (opcional)"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Color
              </label>
              <div className="mb-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setCatForm((s) => ({ ...s, color: hex }))}
                    className={`h-9 w-9 rounded-lg border-2 ${
                      catForm.color === hex
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Color ${hex}`}
                  />
                ))}
              </div>
              <input
                type="color"
                value={catForm.color?.startsWith('#') ? catForm.color : '#f59e0b'}
                onChange={(e) =>
                  setCatForm((s) => ({ ...s, color: e.target.value }))
                }
                className="h-12 w-full max-w-[120px] cursor-pointer rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Orden
              </label>
              <input
                type="number"
                value={catForm.orden}
                onChange={(e) =>
                  setCatForm((s) => ({
                    ...s,
                    orden: Number(e.target.value) || 0,
                  }))
                }
                className={INPUT}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal('none')}
                className="h-12 rounded-lg border border-[#e2e5ed] px-6 font-semibold text-[#111827] dark:border-[#2e3347] dark:text-[#e8eaf0]"
              >
                Cancelar
              </button>
              <button type="button" onClick={submitCategoria} className={BTN_PRIMARY}>
                <span className="flex items-center gap-2">
                  <Check size={20} strokeWidth={1.5} />
                  Guardar
                </span>
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === 'producto' ? (
        <Modal
          title={editingProducto ? 'Editar producto' : 'Nuevo producto'}
          onClose={() => setModal('none')}
        >
          {modalMsg ? (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                modalMsg.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {modalMsg.text}
            </div>
          ) : null}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Nombre
              </label>
              <input
                type="text"
                value={prodForm.nombre}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, nombre: e.target.value }))
                }
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Descripción
              </label>
              <textarea
                value={prodForm.descripcion}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, descripcion: e.target.value }))
                }
                rows={3}
                className={`${INPUT} resize-y`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Precio (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={prodForm.precio}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, precio: e.target.value }))
                }
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                Categoría
              </label>
              <select
                value={prodForm.categoria_id}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, categoria_id: e.target.value }))
                }
                className={INPUT}
              >
                <option value="">Seleccionar…</option>
                {categoriasOrdenadas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
                IVA
              </label>
              <select
                value={prodForm.iva_porcentaje}
                onChange={(e) =>
                  setProdForm((s) => ({
                    ...s,
                    iva_porcentaje: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <option value="10">10%</option>
                <option value="21">21%</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={prodForm.activo}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, activo: e.target.checked }))
                }
                className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[#111827] dark:text-[#e8eaf0]">
                Producto activo
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal('none')}
                className="h-12 rounded-lg border border-[#e2e5ed] px-6 font-semibold dark:border-[#2e3347]"
              >
                Cancelar
              </button>
              <button type="button" onClick={submitProducto} className={BTN_PRIMARY}>
                <span className="flex items-center gap-2">
                  <Check size={20} strokeWidth={1.5} />
                  Guardar
                </span>
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === 'alergenos' && editingProducto ? (
        <Modal
          title={`Alérgenos — ${editingProducto.nombre}`}
          onClose={() => setModal('none')}
        >
          {modalMsg ? (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                modalMsg.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {modalMsg.text}
            </div>
          ) : null}
          <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Marca los alérgenos que contiene el producto (información al
            consumidor).
          </p>
          <div className="grid max-h-[50vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            {alergenosList.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e2e5ed] p-3 dark:border-[#2e3347]"
              >
                <input
                  type="checkbox"
                  checked={alergenosSeleccion.some(
                    (x) => Number(x) === Number(a.id)
                  )}
                  onChange={() => toggleAlergeno(a.id)}
                  className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500"
                />
                <span className="text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                  {a.nombre}
                </span>
              </label>
            ))}
          </div>
          {alergenosList.length === 0 ? (
            <p className="mt-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              No hay alérgenos en el catálogo. Verifica la base de datos.
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal('none')}
              className="h-12 rounded-lg border border-[#e2e5ed] px-6 font-semibold dark:border-[#2e3347]"
            >
              Cancelar
            </button>
            <button type="button" onClick={submitAlergenos} className={BTN_PRIMARY}>
              <span className="flex items-center gap-2">
                <Check size={20} strokeWidth={1.5} />
                Guardar alérgenos
              </span>
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
