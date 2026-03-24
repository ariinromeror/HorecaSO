import { useMemo, useState } from 'react'
import {
  addIngredienteReceta,
  createReceta,
  deleteIngredienteReceta,
  getRecetaCoste,
  updateReceta,
} from '../../../../services/api'
import { UNIDADES_OPTS } from '../recetasUtils'
import { useRecetasFeedback } from './useRecetasFeedback'
import { useRecetasLoads } from './useRecetasLoads'

export function useRecetas() {
  const [feedback, setFeedback] = useRecetasFeedback()
  const {
    recetasSemaforo,
    loadingSemaforo,
    articulos,
    productos,
    loadSemaforo,
    loadArticulosYProductos,
  } = useRecetasLoads(setFeedback)

  const [filtroColor, setFiltroColor] = useState('todos')
  const [recetaDetalle, setRecetaDetalle] = useState(null)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [modalCrear, setModalCrear] = useState(false)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [loadingAddIngrediente, setLoadingAddIngrediente] = useState(false)
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
  const [modalError, setModalError] = useState(null)

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

  return {
    feedback,
    recetasSemaforo,
    filtroColor,
    setFiltroColor,
    loadingSemaforo,
    articulosOrdenados,
    productosSinReceta,
    recetaDetalle,
    modalDetalle,
    setModalDetalle,
    modalCrear,
    setModalCrear,
    loadingDetalle,
    formIngrediente,
    setFormIngrediente,
    formCrear,
    setFormCrear,
    instruccionesDraft,
    setInstruccionesDraft,
    savingInstrucciones,
    modalError,
    setModalError,
    loadSemaforo,
    openDetalle,
    reloadCoste,
    handleCardClick,
    handleDeleteIng,
    handleAddIngrediente,
    handleGuardarInstrucciones,
    handleCrearReceta,
    onSelectArticulo,
    articulos,
    loadingAddIngrediente,
    loadArticulosYProductos,
  }
}
