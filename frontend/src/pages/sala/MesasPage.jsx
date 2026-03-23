import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { tokens } from '../../constants/uiTokens'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { getMesas, patchMesaEstado } from '../../services/api'

function mesaEstadoKey(estado) {
  const e = String(estado || '')
    .toLowerCase()
    .trim()
  if (['libre', 'ocupada', 'reservada', 'bloqueada'].includes(e)) {
    return e
  }
  return 'bloqueada'
}

const chairPositions = [
  { top: '-6px', left: '50%', transform: 'translateX(-50%)' },
  { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' },
  { left: '-6px', top: '50%', transform: 'translateY(-50%)' },
  { right: '-6px', top: '50%', transform: 'translateY(-50%)' },
]

function MesaCard({ mesa, onNavigate, onMarcarLibre, liberando }) {
  const estado = mesaEstadoKey(mesa.estado)
  const t = tokens.shared.mesa[estado]
  const clickable = estado === 'libre' || estado === 'ocupada'

  const handleClick = () => {
    if (clickable) {
      onNavigate(mesa.id)
    }
  }

  const handleKeyDown = (e) => {
    if (!clickable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onNavigate(mesa.id)
    }
  }

  return (
    <div className="relative max-w-[148px] w-full min-w-0">
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={[
          'relative w-full transition-transform',
          clickable
            ? 'cursor-pointer hover:scale-105'
            : 'cursor-not-allowed opacity-60',
        ].join(' ')}
      >
        <div
          className="relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 p-3"
          style={{
            borderColor: t.border,
            background: t.bg,
          }}
        >
        {chairPositions.map((pos, i) => (
          <span
            key={i}
            className="absolute h-3 w-3 rounded-full"
            style={{
              ...pos,
              backgroundColor: t.border,
            }}
            aria-hidden
          />
        ))}

        <span
          className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          style={{
            color: t.text,
            background: t.bg,
            border: `1px solid ${t.border}`,
          }}
        >
          {t.label}
        </span>

        <span
          className="text-2xl font-bold"
          style={{ color: t.text }}
        >
          {mesa.numero}
        </span>
        <span className="mt-1 text-[11px] text-[#6b7280] dark:text-[#8b90a7]">
          {mesa.zona || '—'}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[11px] text-[#9ca3af]">
          <Users size={11} strokeWidth={1.5} aria-hidden />
          {mesa.capacidad ?? '—'} pax
        </span>
        </div>
      </div>
      {estado === 'ocupada' && onMarcarLibre ? (
        <button
          type="button"
          disabled={!!liberando}
          onClick={(e) => {
            e.stopPropagation()
            onMarcarLibre(mesa)
          }}
          className="mt-1.5 w-full rounded-lg border border-[#e2e5ed] bg-white py-1.5 text-[11px] font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] dark:hover:bg-[#222536]"
        >
          {liberando ? '…' : 'Marcar libre'}
        </button>
      ) : null}
    </div>
  )
}

export default function MesasPage() {
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

  if (loading) {
    return <Loader />
  }

  if (error) {
    return <EmptyState message={error} />
  }

  if (mesas.length === 0) {
    return (
      <EmptyState message="No hay mesas configuradas en este local." />
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
        Sala — Mesas
      </h1>
      <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        Pulsa una mesa libre u ocupada para abrir el TPV.
      </p>

      {zonasOrdenadas.map((zona) => (
        <section key={zona}>
          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#8b90a7]">
            {zona}
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {[...mesasPorZona[zona]]
              .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
              .map((mesa) => (
                <MesaCard
                  key={mesa.id}
                  mesa={mesa}
                  onNavigate={goTpv}
                  onMarcarLibre={handleMarcarMesaLibre}
                  liberando={liberandoMesaId === mesa.id}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
