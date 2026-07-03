import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteProveedor,
  getProveedorDetalle,
  getProveedores,
} from '../../../services/api'

/**
 * Hook de referencia para la migración a React Query (Fase 8 del PRD de
 * hardening) de listados "estáticos" (sin polling, se recargan por acción
 * del usuario: búsqueda, filtro o tras guardar/borrar). Ver
 * `frontend/README.md` para el patrón completo.
 */
export function useProveedores() {
  const queryClient = useQueryClient()

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

  const queryKey = ['proveedores', { buscar: buscarDebounced, soloActivos }]

  const {
    data: proveedores = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = {}
      if (buscarDebounced) params.buscar = buscarDebounced
      if (soloActivos) params.activo = true
      const r = await getProveedores(params)
      return Array.isArray(r.data) ? r.data : []
    },
  })

  const error = queryError
    ? queryError.response?.data?.detail || 'Error al cargar proveedores'
    : null

  const cargar = () => queryClient.invalidateQueries({ queryKey: ['proveedores'] })

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
