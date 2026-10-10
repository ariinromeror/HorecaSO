import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMesas, patchMesaEstado } from '../../../services/api'

export function useMesasSala() {
  const navigate = useNavigate()
  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [liberandoMesaId, setLiberandoMesaId] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getMesas()
        if (!cancelled) {
          setMesas(Array.isArray(res.data) ? res.data : [])
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e.response?.data?.detail || 'No se pudieron cargar las mesas'
          )
          setMesas([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const mesasPorZona = useMemo(() => {
    return mesas.reduce((acc, m) => {
      const z = (m.zona && String(m.zona).trim()) || 'Sin zona'
      if (!acc[z]) acc[z] = []
      acc[z].push(m)
      return acc
    }, {})
  }, [mesas])

  const zonasOrdenadas = useMemo(() => {
    return Object.keys(mesasPorZona).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [mesasPorZona])

  const goTpv = (mesaId) => {
    navigate(`/tpv/${mesaId}`)
  }

  const handleMesaReservada = (mesa) => {
    const hora = mesa.reserva_hora
      ? String(mesa.reserva_hora).slice(0, 5)
      : null
    const nombre = mesa.reserva_nombre || 'Cliente'
    const pax = mesa.reserva_personas
    const paxTxt = pax != null ? ` (${pax} pax)` : ''
    if (hora) {
      window.alert(
        `Mesa reservada a las ${hora} — ${nombre}${paxTxt}`
      )
    } else {
      window.alert(
        `Mesa reservada — ${nombre}${paxTxt || ''}. Consulta Reservas para más detalle.`
      )
    }
  }

  const handleMarcarMesaLibre = async (mesa) => {
    if (
      !window.confirm(
        '¿Marcar esta mesa como libre? Solo si no hubo pedido o fue un error.'
      )
    ) {
      return
    }
    setLiberandoMesaId(mesa.id)
    try {
      await patchMesaEstado(mesa.id, { estado: 'libre' })
      const res = await getMesas()
      setMesas(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      window.alert(
        e.response?.data?.detail || 'No se pudo actualizar el estado de la mesa'
      )
    } finally {
      setLiberandoMesaId(null)
    }
  }

  return {
    mesas,
    loading,
    error,
    liberandoMesaId,
    mesasPorZona,
    zonasOrdenadas,
    goTpv,
    handleMesaReservada,
    handleMarcarMesaLibre,
  }
}
