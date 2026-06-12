import MesaCard from '../../sala/components/MesaCard'
import TopProductoRow from '../../../components/shared/TopProductoRow'

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
      <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 text-center shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] sm:p-6 lg:col-span-3 lg:p-8">
        <p className="horeca-nums text-4xl font-bold text-amber-500 sm:text-5xl lg:text-6xl">
          {formatEuro(ventasHoy)}
        </p>
        <p className="mt-2 text-[15px] font-medium text-[#6b7280] dark:text-[#8b90a7]">
          Ventas de hoy
        </p>
      </div>

      <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] sm:p-6 lg:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Mesas activas ahora
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
          {mesasActivas.map((mesa) => (
            <MesaCard key={mesa.id} mesa={mesa} onNavigate={goTpv} />
          ))}
        </div>
        {mesasActivas.length === 0 ? (
          <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
            No hay mesas libres u ocupadas para mostrar.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] sm:p-6 lg:col-span-1">
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
              <TopProductoRow
                key={`${item.nombre}-${i}`}
                nombre={item.nombre}
                cantidad={c}
                pct={pct}
              />
            )
          })
        )}
      </div>
    </>
  )
}
