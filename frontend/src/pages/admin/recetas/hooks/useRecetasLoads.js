import { useCallback, useEffect, useState } from 'react'
import {
  getAdminProductos,
  getArticulosInventario,
  getRecetasSemaforo,
} from '../../../../services/api'

export function useRecetasLoads(setFeedback) {
  const [recetasSemaforo, setRecetasSemaforo] = useState([])
  const [loadingSemaforo, setLoadingSemaforo] = useState(true)
  const [articulos, setArticulos] = useState([])
  const [productos, setProductos] = useState([])

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

  return {
    recetasSemaforo,
    setRecetasSemaforo,
    loadingSemaforo,
    articulos,
    productos,
    loadSemaforo,
    loadArticulosYProductos,
  }
}
