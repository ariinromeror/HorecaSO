import { Users } from 'lucide-react'
import { tokens } from '../../../constants/uiTokens'

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

export default function MesaCard({ mesa, onNavigate, onMarcarLibre, liberando }) {
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
