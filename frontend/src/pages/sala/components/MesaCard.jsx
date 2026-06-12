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
          className="relative grid aspect-square w-full grid-rows-[auto_minmax(2.25rem,1fr)_auto] items-center gap-1 rounded-xl border-2 px-2 py-2 sm:gap-1.5 sm:p-3"
          style={{
            borderColor: t.border,
            background: t.bg,
          }}
        >
          {chairPositions.map((pos, i) => (
            <span
              key={i}
              className="absolute h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3"
              style={{
                ...pos,
                backgroundColor: t.border,
              }}
              aria-hidden
            />
          ))}

          {/* Estado arriba (flujo normal) — evita solapamiento con el número en móvil */}
          <span
            className="z-10 mx-auto max-w-full shrink-0 truncate rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:text-[10px]"
            style={{
              color: t.text,
              background: t.bg,
              border: `1px solid ${t.border}`,
            }}
          >
            {t.label}
          </span>

          <span
            className="z-10 flex items-center justify-center self-center text-lg font-bold leading-none sm:text-2xl"
            style={{ color: t.text }}
          >
            {mesa.numero}
          </span>

          <div className="z-10 flex w-full flex-col items-center gap-0.5 self-end text-center">
            <span className="max-w-full truncate text-[10px] font-medium capitalize tracking-wide text-[#6b7280] dark:text-[#8b90a7] sm:text-[11px]">
              {mesa.zona || '—'}
            </span>
            <span className="horeca-nums flex items-center gap-1 text-[10px] font-medium text-[#9ca3af] sm:text-[11px]">
              <Users size={11} strokeWidth={1.5} aria-hidden />
              {mesa.capacidad ?? '—'} pax
            </span>
          </div>
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
