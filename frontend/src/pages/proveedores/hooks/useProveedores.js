import { useCallback, useEffect, useState } from 'react'
import {
  deleteProveedor,
  getProveedorDetalle,
  getProveedores,
} from '../../../services/api'

export function useProveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [modalProveedor, setModalProveedor] = useState(null)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setBuscarDebounced(buscarInput.trim()), 350)
    return () => clearTimeout(t)
  }, [buscarInput])

  useEffect(() => {
    if (!feedback?.msg) return
    const id = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(id)
  }, [feedback])

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (buscarDebounced) params.buscar = buscarDebounced
      if (soloActivos) params.activo = true
      const r = await getProveedores(params)
      setProveedores(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar proveedores')
      setProveedores([])
    } finally {
      setLoading(false)
    }
  }, [buscarDebounced, soloActivos])

  useEffect(() => {
    cargar()
  }, [cargar])

  const abrirDetalle = async (p) => {
    setModalDetalle({ ...p, facturas_recientes: [] })
    setDetalleLoading(true)
    try {
      const r = await getProveedorDetalle(p.id)
      setModalDetalle(r.data)
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar detalle',
        type: 'err',
      })
      setModalDetalle(null)
    } finally {
      setDetalleLoading(false)
    }
  }

  const handleDesactivar = async (p) => {
    if (!window.confirm(`¿Desactivar proveedor "${p.nombre}"?`)) return
    try {
      await deleteProveedor(p.id)
      setFeedback({ msg: 'Proveedor desactivado', type: 'ok' })
      cargar()
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'No se pudo desactivar',
        type: 'err',
      })
    }
  }

  return {
    proveedores,
    loading,
    error,
    buscarInput,
    setBuscarInput,
    soloActivos,
    setSoloActivos,
    modalProveedor,
    setModalProveedor,
    modalDetalle,
    setModalDetalle,
    detalleLoading,
    feedback,
    setFeedback,
    cargar,
    abrirDetalle,
    handleDesactivar,
  }
}
