import { useCallback, useEffect, useState } from 'react'
import {
  createAdminCategoria,
  createAdminProducto,
  deleteAdminCategoria,
  deleteAdminProducto,
  setProductoAlergenos,
  updateAdminCategoria,
  updateAdminProducto,
} from '../../../../services/api'
import { stripEmojis } from '../../../../utils/textSanitize'
import { useLoadCatalogos } from './useLoadCatalogos'
import { useCartaModalOpeners } from './useCartaModalOpeners'

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

export function useCarta() {
  const {
    categoriasOrdenadas,
    productosFiltrados,
    loadingCat,
    loadingProd,
    errorCat,
    errorProd,
    filtroCategoriaId,
    setFiltroCategoriaId,
    searchText,
    setSearchText,
    alergenosList,
    loadCategorias,
    loadProductos,
  } = useLoadCatalogos()

  const [tab, setTab] = useState('categorias')
  const [alergenosCache, setAlergenosCache] = useState({})
  const { feedback, show: showFeedback } = useFeedback()

  const m = useCartaModalOpeners(categoriasOrdenadas, alergenosCache)

  const submitCategoria = async () => {
    m.setModalMsg(null)
    try {
      const nombreLimpio = stripEmojis(m.catForm.nombre).trim()
      const iconoLimpio = stripEmojis(m.catForm.icono).trim() || null
      const body = {
        nombre: nombreLimpio,
        icono: iconoLimpio,
        color: m.catForm.color || null,
        orden: Number(m.catForm.orden) || 0,
      }
      if (!body.nombre) {
        m.setModalMsg({
          type: 'error',
          text: 'El nombre es obligatorio (sin emojis)',
        })
        return
      }
      if (m.editingCategoria) {
        await updateAdminCategoria(m.editingCategoria.id, body)
      } else {
        await createAdminCategoria(body)
      }
      await loadCategorias()
      showFeedback('success', m.editingCategoria ? 'Categoría actualizada' : 'Categoría creada')
      m.setModal('none')
    } catch (e) {
      const d = e.response?.data?.detail
      m.setModalMsg({
        type: 'error',
        text: typeof d === 'string' ? d : 'Error al guardar',
      })
    }
  }

  const submitProducto = async () => {
    m.setModalMsg(null)
    try {
      const nombre = m.prodForm.nombre.trim()
      if (!nombre) {
        m.setModalMsg({ type: 'error', text: 'El nombre es obligatorio' })
        return
      }
      if (!m.prodForm.categoria_id) {
        m.setModalMsg({ type: 'error', text: 'Selecciona una categoría' })
        return
      }
      const precio = Number(m.prodForm.precio)
      if (Number.isNaN(precio) || precio < 0) {
        m.setModalMsg({ type: 'error', text: 'Precio no válido' })
        return
      }
      const iva = Number(m.prodForm.iva_porcentaje)
      const base = {
        nombre,
        descripcion: m.prodForm.descripcion.trim() || null,
        precio,
        categoria_id: m.prodForm.categoria_id,
        iva_porcentaje: iva,
      }
      if (m.editingProducto) {
        await updateAdminProducto(m.editingProducto.id, {
          ...base,
          activo: m.prodForm.activo,
        })
        showFeedback('success', 'Producto actualizado')
      } else {
        const created = await createAdminProducto({
          ...base,
          es_bebida: false,
          tiene_receta: false,
          disponible_delivery: true,
          tiempo_preparacion: 0,
          destino_kds: m.prodForm.destino_kds,
        })
        const newId = created.data?.id
        if (newId && !m.prodForm.activo) {
          await updateAdminProducto(newId, { activo: false })
        }
        showFeedback('success', 'Producto creado')
      }
      await loadProductos()
      m.setModal('none')
    } catch (e) {
      const d = e.response?.data?.detail
      m.setModalMsg({
        type: 'error',
        text: typeof d === 'string' ? d : 'Error al guardar producto',
      })
    }
  }

  const submitAlergenos = async () => {
    if (!m.editingProducto) return
    m.setModalMsg(null)
    try {
      await setProductoAlergenos(m.editingProducto.id, m.alergenosSeleccion)
      setAlergenosCache((prev) => ({
        ...prev,
        [m.editingProducto.id]: [...m.alergenosSeleccion],
      }))
      showFeedback('success', 'Alérgenos guardados')
      m.setModal('none')
    } catch (e) {
      const d = e.response?.data?.detail
      m.setModalMsg({
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

  return {
    tab,
    setTab,
    modal: m.modal,
    setModal: m.setModal,
    editingCategoria: m.editingCategoria,
    editingProducto: m.editingProducto,
    categoriasOrdenadas,
    productosFiltrados,
    loadingCat,
    loadingProd,
    errorCat,
    errorProd,
    filtroCategoriaId,
    setFiltroCategoriaId,
    searchText,
    setSearchText,
    alergenosList,
    alergenosSeleccion: m.alergenosSeleccion,
    feedback,
    catForm: m.catForm,
    setCatForm: m.setCatForm,
    prodForm: m.prodForm,
    setProdForm: m.setProdForm,
    modalMsg: m.modalMsg,
    openCategoriaModal: m.openCategoriaModal,
    openProductoModal: m.openProductoModal,
    openAlergenosModal: m.openAlergenosModal,
    toggleAlergeno: m.toggleAlergeno,
    submitCategoria,
    submitProducto,
    submitAlergenos,
    handleDeleteCategoria,
    handleDeleteProducto,
    toggleProductoActivo,
  }
}
