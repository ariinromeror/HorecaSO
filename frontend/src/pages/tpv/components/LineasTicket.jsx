import { Minus, ShoppingCart } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import { formatEuro } from '../constants'

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
          return (
            <div
              key={String(g.producto_id)}
              className="flex items-center gap-2 border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-tight text-[#111827] dark:text-[#e8eaf0]">
                  {nombre} x{g.cantidad} — {formatEuro(g.subtotal)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRestarUnidadGrupo(g.producto_id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-40"
                aria-label="Quitar una unidad"
              >
                <Minus size={14} strokeWidth={1.5} />
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
