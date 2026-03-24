import { useEffect, useState } from 'react'
import { getCierreDia, getDashboardDirector } from '../../../services/api'

export function useDashboard() {
  const [data, setData] = useState(null)
  const [cierre, setCierre] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [dashRes, cierreRes] = await Promise.all([
          getDashboardDirector(),
          getCierreDia(),
        ])
        if (!cancelled) {
          setData(dashRes.data)
          setCierre(cierreRes.data)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e.response?.data?.detail || 'No se pudieron cargar los datos'
          )
          setData(null)
          setCierre(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, cierre, loading, error }
}
