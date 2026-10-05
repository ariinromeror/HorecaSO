import { Minus, ShoppingCart } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import { formatEuro } from '../constants'

function badgeDestino(g) {
  if (g.destino_kds === 'cocina' || g.enviado_cocina) {
    return {
      label: `Cocina · ${g.estado_cocina || 'pendiente'}`,
      className:
        'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    }
  }
  if (g.destino_kds === 'barra' || g.enviado_barra) {
    return {
      label: `Barra · ${g.estado_barra || 'pendiente'}`,
      className:
        'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    }
  }
  return null
}

export default function LineasTicket({
  lineas,
  lineasAgrupadas,
  productoNombrePorId,
  actionLoading,
  handleRestarUnidadGrupo,
}) {
  return (
    <div className="shrink-0">
      {lineas.length === 0 ? (
        <EmptyState
          Icon={ShoppingCart}
          message="Sin productos aún"
        />
      ) : (
        lineasAgrupadas.map((g) => {
          const nombre =
            productoNombrePorId.get(String(g.producto_id)) ||
            g.producto_id
          const busy = !!actionLoading[`grp-${String(g.producto_id)}`]
          const badge = badgeDestino(g)
          return (
            <div
              key={String(g.producto_id)}
              className="flex items-center gap-2 border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-tight text-[#111827] dark:text-[#e8eaf0]">
                  {nombre} x{g.cantidad} — {formatEuro(g.subtotal)}
                </p>
                {badge ? (
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRestarUnidadGrupo(g.producto_id)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 active:bg-red-500/20 hover:bg-red-500/20 disabled:opacity-40"
                aria-label="Quitar una unidad"
              >
                <Minus size={18} strokeWidth={1.5} />
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
