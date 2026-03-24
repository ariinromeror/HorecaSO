import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getArticulos,
  getFacturaProveedor,
  getFacturasPendientes,
  getFacturasProveedor,
  getProveedores,
  pagarFactura,
} from '../../../services/api'

export function useFacturas() {
  const [searchParams, setSearchParams] = useSearchParams()
  const proveedorUrl = searchParams.get('proveedor_id') || ''

  const [tabActiva, setTabActiva] = useState('todas')
  const [facturas, setFacturas] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [proveedores, setProveedores] = useState([])
  const [articulos, setArticulos] = useState([])
  const [modalFactura, setModalFactura] = useState(false)
  const [modalLineas, setModalLineas] = useState(null)
  const [modalIA, setModalIA] = useState(false)
  const [lineasDetalleLoading, setLineasDetalleLoading] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [resultadoIA, setResultadoIA] = useState(null)
  const [filtros, setFiltros] = useState({
    proveedor_id: proveedorUrl,
    pagada: '',
    desde: '',
    hasta: '',
  })
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    setFiltros((f) => ({ ...f, proveedor_id: proveedorUrl }))
  }, [proveedorUrl])

  useEffect(() => {
    if (!feedback?.msg) return
    const t = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(t)
  }, [feedback])

  const cargarProveedoresArticulos = useCallback(async () => {
    try {
      const [pr, ar] = await Promise.all([
        getProveedores({ activo: true }),
        getArticulos({}),
      ])
      setProveedores(Array.isArray(pr.data) ? pr.data : [])
      setArticulos(Array.isArray(ar.data) ? ar.data : [])
    } catch {
      setProveedores([])
      setArticulos([])
    }
  }, [])

  useEffect(() => {
    cargarProveedoresArticulos()
  }, [cargarProveedoresArticulos])

  const cargarFacturas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tabActiva === 'pendientes') {
        const r = await getFacturasPendientes()
        setPendientes(Array.isArray(r.data) ? r.data : [])
        setFacturas([])
      } else {
        const params = {}
        if (filtros.proveedor_id) params.proveedor_id = filtros.proveedor_id
        if (filtros.pagada === 'true') params.pagada = true
        if (filtros.pagada === 'false') params.pagada = false
        if (filtros.desde) params.desde = filtros.desde
        if (filtros.hasta) params.hasta = filtros.hasta
        const r = await getFacturasProveedor(params)
        setFacturas(Array.isArray(r.data) ? r.data : [])
        setPendientes([])
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar facturas')
      setFacturas([])
      setPendientes([])
    } finally {
      setLoading(false)
    }
  }, [tabActiva, filtros])

  useEffect(() => {
    cargarFacturas()
  }, [cargarFacturas])

  const listaMostrada = tabActiva === 'pendientes' ? pendientes : facturas

  const abrirLineas = async (f) => {
    setModalLineas({ ...f, lineas: [] })
    setLineasDetalleLoading(true)
    try {
      const r = await getFacturaProveedor(f.id)
      setModalLineas(r.data)
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar líneas',
        type: 'err',
      })
      setModalLineas(null)
    } finally {
      setLineasDetalleLoading(false)
    }
  }

  const marcarPagada = async (id) => {
    try {
      await pagarFactura(id)
      setFeedback({ msg: 'Factura marcada como pagada', type: 'ok' })
      cargarFacturas()
      if (modalLineas?.id === id) {
        setModalLineas((m) => (m ? { ...m, pagada: true } : null))
      }
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'No se pudo marcar como pagada',
        type: 'err',
      })
    }
  }

  const syncProveedorUrl = (id) => {
    if (id) {
      setSearchParams({ proveedor_id: id })
    } else {
      setSearchParams({})
    }
  }

  return {
    tabActiva,
    setTabActiva,
    facturas,
    pendientes,
    loading,
    error,
    proveedores,
    articulos,
    modalFactura,
    setModalFactura,
    modalLineas,
    setModalLineas,
    modalIA,
    setModalIA,
    lineasDetalleLoading,
    escaneando,
    setEscaneando,
    resultadoIA,
    setResultadoIA,
    filtros,
    setFiltros,
    feedback,
    setFeedback,
    listaMostrada,
    cargarFacturas,
    abrirLineas,
    marcarPagada,
    syncProveedorUrl,
  }
}
