import { useCallback } from 'react'
import {
  getArticulos,
  getMovimientos,
  getStockAlertas,
} from '../../../services/api'

export function useInventarioLoads({
  buscarDebounced,
  categoriaFiltro,
  soloAlertas,
  setLoadingArticulos,
  setArticulos,
  setFeedback,
  setArticulosOpciones,
  setMovimientos,
  setLoadingMovimientos,
  setAlertas,
}) {
  const loadAlertas = useCallback(async () => {
    try {
      const r = await getStockAlertas()
      setAlertas(Array.isArray(r.data) ? r.data : [])
    } catch {
      setAlertas([])
    }
  }, [setAlertas])

  const loadArticulos = useCallback(async () => {
    setLoadingArticulos(true)
    try {
      const params = {}
      if (buscarDebounced.trim()) params.buscar = buscarDebounced.trim()
      if (categoriaFiltro) params.categoria = categoriaFiltro
      if (soloAlertas) params.alerta = true
      const r = await getArticulos(params)
      setArticulos(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setArticulos([])
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar artículos',
        type: 'error',
      })
    } finally {
      setLoadingArticulos(false)
    }
  }, [buscarDebounced, categoriaFiltro, soloAlertas])

  const loadArticulosOpciones = useCallback(async () => {
    try {
      const r = await getArticulos({})
      setArticulosOpciones(Array.isArray(r.data) ? r.data : [])
    } catch {
      setArticulosOpciones([])
    }
  }, [setArticulosOpciones])

  const loadMovimientos = useCallback(async (params = {}) => {
    setLoadingMovimientos(true)
    try {
      const q = { ...params }
      if (q.articulo_id === '') delete q.articulo_id
      if (q.tipo === '') delete q.tipo
      if (!q.desde) delete q.desde
      if (!q.hasta) delete q.hasta
      const r = await getMovimientos(q)
      setMovimientos(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setMovimientos([])
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar movimientos',
        type: 'error',
      })
    } finally {
      setLoadingMovimientos(false)
    }
  }, [])

  return {
    loadAlertas,
    loadArticulos,
    loadArticulosOpciones,
    loadMovimientos,
  }
}
