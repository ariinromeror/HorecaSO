import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAdminCategorias,
  getAdminProductos,
  getAlergenos,
} from '../../../../services/api'

export function useLoadCatalogos() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [alergenosList, setAlergenosList] = useState([])

  const [loadingCat, setLoadingCat] = useState(false)
  const [loadingProd, setLoadingProd] = useState(false)
  const [errorCat, setErrorCat] = useState(null)
  const [errorProd, setErrorProd] = useState(null)

  const [filtroCategoriaId, setFiltroCategoriaId] = useState('')
  const [searchText, setSearchText] = useState('')

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

  return {
    categorias,
    setCategorias,
    productos,
    setProductos,
    alergenosList,
    loadingCat,
    loadingProd,
    errorCat,
    errorProd,
    filtroCategoriaId,
    setFiltroCategoriaId,
    searchText,
    setSearchText,
    loadCategorias,
    loadProductos,
    loadAlergenos,
    categoriasOrdenadas,
    productosFiltrados,
  }
}
