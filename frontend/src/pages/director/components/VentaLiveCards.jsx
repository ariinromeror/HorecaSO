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

function MesaCardLive({ mesa, onNavigate }) {
  const estado = mesaEstadoKey(mesa.estado)
  const t = tokens.shared.mesa[estado]
  const clickable = estado === 'libre' || estado === 'ocupada'

  const handleClick = () => {
    if (clickable) onNavigate(mesa.id)
  }

  const handleKeyDown = (e) => {
    if (!clickable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onNavigate(mesa.id)
    }
  }

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'relative w-full max-w-[148px] transition-transform',
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
  )
}

function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

export default function VentaLiveCards({
  ventasHoy,
  mesasActivas,
  goTpv,
  topProductos,
  maxCantidad,
}) {
  return (
    <>
      <div className="rounded-xl border border-[#e2e5ed] bg-white p-8 text-center shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-3">
        <p className="text-6xl font-bold text-amber-500">
          {formatEuro(ventasHoy)}
        </p>
        <p className="mt-2 text-[15px] font-medium text-[#6b7280] dark:text-[#8b90a7]">
          Ventas de hoy
        </p>
      </div>

      <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Mesas activas ahora
        </h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {mesasActivas.map((mesa) => (
            <MesaCardLive key={mesa.id} mesa={mesa} onNavigate={goTpv} />
          ))}
        </div>
        {mesasActivas.length === 0 ? (
          <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
            No hay mesas libres u ocupadas para mostrar.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-1">
        <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Top productos del día
        </h2>
        {topProductos.length === 0 ? (
          <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
            Sin ventas hoy
          </p>
        ) : (
          topProductos.map((item, i) => {
            const c = Number(item.cantidad) || 0
            const pct = (c / maxCantidad) * 100
            return (
              <div
                key={`${item.nombre}-${i}`}
                className="mb-3 flex items-center gap-3"
              >
                <span className="flex-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                  {item.nombre}
                </span>
                <span className="w-8 text-right text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {c}
                </span>
                <div className="h-2 w-32 shrink-0 rounded-full bg-[#f0f2f5] dark:bg-[#222536]">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
