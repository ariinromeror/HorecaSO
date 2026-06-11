import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createReceta, deleteReceta } from '../../../../services/api'
import { useRecetasFeedback } from './useRecetasFeedback'
import { useRecetasLoads } from './useRecetasLoads'

export function useRecetas() {
  const navigate = useNavigate()
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
  const [modalCrear, setModalCrear] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [formCrear, setFormCrear] = useState({
    producto_id: '',
    rendimiento: '1',
    instrucciones: '',
  })

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

  const handleCardClick = useCallback(
    (row) => {
      if (row.receta_id) {
        navigate(
          `/admin/recetas/elaboraciones?receta=${encodeURIComponent(row.receta_id)}`
        )
      } else {
        setFormCrear((f) => ({
          ...f,
          producto_id: row.producto_id,
          rendimiento: '1',
          instrucciones: '',
        }))
        setModalCrear(true)
      }
    },
    [navigate]
  )

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
        navigate(
          `/admin/recetas/elaboraciones?receta=${encodeURIComponent(String(newId))}`
        )
      }
    } catch (e) {
      setModalError(
        e.response?.data?.detail || 'No se pudo crear la receta'
      )
    }
  }

  const handleDeleteReceta = useCallback(
    async (row) => {
      if (!row.receta_id) return
      const ok = window.confirm(
        '¿Eliminar esta receta y sus ingredientes? El producto seguirá en carta, pero sin coste de cocina.'
      )
      if (!ok) return
      try {
        await deleteReceta(row.receta_id)
        setFeedback({ type: 'success', msg: 'Receta eliminada' })
        await loadSemaforo()
        await loadArticulosYProductos()
      } catch (e) {
        setFeedback({
          type: 'error',
          msg: e.response?.data?.detail || 'No se pudo eliminar la receta',
        })
      }
    },
    [loadArticulosYProductos, loadSemaforo, setFeedback]
  )

  return {
    feedback,
    recetasSemaforo,
    filtroColor,
    setFiltroColor,
    loadingSemaforo,
    articulosOrdenados,
    productosSinReceta,
    modalCrear,
    setModalCrear,
    loadingDetalle: false,
    formCrear,
    setFormCrear,
    modalError,
    setModalError,
    loadSemaforo,
    handleCardClick,
    handleCrearReceta,
    handleDeleteReceta,
    articulos,
    loadArticulosYProductos,
  }
}
