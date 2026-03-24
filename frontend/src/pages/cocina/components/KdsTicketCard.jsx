import { Clock } from 'lucide-react'
import {
  ICON,
  badgeComandaClass,
  badgeComandaLabel,
  cardBgClass,
  cardTopBorder,
  estadoBadgeClass,
  estadoLabel,
  lineaWaitClass,
  minutosDesde,
} from '../kdsHelpers'

export default function KdsTicketCard({ comanda: c, cambiarEstado }) {
  const alerta = c.alerta_comanda || 'ok'
  const mesaLabel =
    c.mesa_numero != null && c.mesa_numero !== ''
      ? `Mesa ${c.mesa_numero}`
      : 'Sin mesa'
  const zona = c.mesa_zona
    ? String(c.mesa_zona).replace(/_/g, ' ')
    : null
  const minsTicket = minutosDesde(c.ticket_created_at)

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border border-[#e2e5ed] shadow-sm dark:border-[#2e3347] ${cardTopBorder(alerta)} ${cardBgClass(alerta)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#f5f5f5]">
            {mesaLabel}
          </h2>
          {zona ? (
            <p className="mt-0.5 text-sm capitalize text-[#6b7280] dark:text-[#9ca3af]">
              {zona}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${badgeComandaClass(alerta)}`}
        >
          {badgeComandaLabel(alerta)}
        </span>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-[#e2e5ed] dark:divide-[#2e3347]">
        {(c.lineas || []).map((ln) => {
          const est = (
            ln.estado_kds ||
            ln.estado_cocina ||
            'pendiente'
          ).toLowerCase()
          const mins = Number(ln.minutos_espera ?? 0)
          const waitLabel = `${mins}m`

          return (
            <li key={ln.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-base font-medium text-[#111827] dark:text-[#e8eaf0]">
                  <span className="tabular-nums">
                    {ln.cantidad}×
                  </span>{' '}
                  {ln.producto_nombre}
                </p>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 text-sm tabular-nums ${lineaWaitClass(ln.alerta)}`}
                >
                  <Clock
                    {...ICON}
                    className="h-4 w-4"
                    aria-hidden
                  />
                  {waitLabel}
                </span>
              </div>
              {ln.nota ? (
                <p className="mt-1 text-sm italic text-[#6b7280] dark:text-[#9ca3af]">
                  {ln.nota}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(est)}`}
                >
                  {estadoLabel(est)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {est === 'pendiente' ? (
                  <button
                    type="button"
                    onClick={() =>
                      cambiarEstado(ln.id, 'preparando')
                    }
                    className="h-10 min-w-[120px] rounded-lg bg-blue-500/15 px-4 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/25 dark:text-blue-400"
                  >
                    Preparando
                  </button>
                ) : null}
                {est === 'preparando' ? (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(ln.id, 'listo')}
                    className="h-10 min-w-[120px] rounded-lg bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/25 dark:text-emerald-400"
                  >
                    Listo
                  </button>
                ) : null}
                {est === 'listo' ? (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(ln.id, 'servido')}
                    className="h-10 min-w-[120px] rounded-lg bg-amber-500/15 px-4 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-400"
                  >
                    Ya salió
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="border-t border-[#e2e5ed] p-3 text-sm text-[#6b7280] dark:text-[#9ca3af] dark:border-[#2e3347]">
        {minsTicket != null ? (
          <p>
            Ticket abierto hace{' '}
            <span className="font-medium tabular-nums">
              {minsTicket} min
            </span>
          </p>
        ) : (
          <p>Ticket en curso</p>
        )}
      </footer>
    </article>
  )
}
