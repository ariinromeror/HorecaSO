import { useCallback, useEffect, useState } from 'react'
import {
  getKDSComandas,
  getKDSEstadisticas,
  patchKDSLineaEstado,
} from '../../../services/api'

export function useKdsComandas() {
  const [comandas, setComandas] = useState([])
  const [stats, setStats] = useState({
    platos_pendientes: 0,
    platos_preparando: 0,
    platos_listos_recogida: 0,
    platos_completados: 0,
    comandas_activas: 0,
    producto_mas_pedido: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [pollError, setPollError] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [comandasRes, statsRes] = await Promise.all([
        getKDSComandas(),
        getKDSEstadisticas(),
      ])
      setComandas(Array.isArray(comandasRes.data) ? comandasRes.data : [])
      setStats({
        platos_pendientes: statsRes.data?.platos_pendientes ?? 0,
        platos_preparando: statsRes.data?.platos_preparando ?? 0,
        platos_listos_recogida: statsRes.data?.platos_listos_recogida ?? 0,
        platos_completados: statsRes.data?.platos_completados ?? 0,
        comandas_activas: statsRes.data?.comandas_activas ?? 0,
        producto_mas_pedido: statsRes.data?.producto_mas_pedido ?? null,
      })
      setLastUpdate(new Date())
      setPollError(false)
    } catch (e) {
      console.error('KDS polling error:', e)
      setPollError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    setSecondsAgo(0)
  }, [lastUpdate])

  useEffect(() => {
    const timer = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [lastUpdate])

  const cambiarEstado = async (lineaId, nuevoEstado) => {
    try {
      await patchKDSLineaEstado(lineaId, nuevoEstado)
      const res = await getKDSComandas()
      setComandas(Array.isArray(res.data) ? res.data : [])
      setLastUpdate(new Date())
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cambiar estado')
      setTimeout(() => setError(null), 3000)
    }
  }

  const secText =
    lastUpdate == null
      ? '—'
      : secondsAgo < 60
        ? `${secondsAgo}s`
        : `${Math.floor(secondsAgo / 60)}m`

  return {
    comandas,
    stats,
    loading,
    error,
    lastUpdate,
    secondsAgo,
    pollError,
    cambiarEstado,
    secText,
  }
}
