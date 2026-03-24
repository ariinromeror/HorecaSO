import { useMemo } from 'react'
import {
  AlertTriangle,
  DollarSign,
  LayoutGrid,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import StatCard from '../../../components/shared/StatCard'

function fmtEuroNum(n) {
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)}€`
}

export default function DashboardKPIs({ data, cierre }) {
  const topProductos = data?.top_5_productos_hoy ?? []
  const maxCantidad = useMemo(() => {
    if (!topProductos.length) return 1
    return Math.max(...topProductos.map((p) => Number(p.cantidad) || 0), 1)
  }, [topProductos])

  const alertas = data?.alertas_stock ?? []

  const filasCierre = cierre
    ? [
        ['Efectivo', cierre.total_efectivo],
        ['Tarjeta', cierre.total_tarjeta],
        ['Bizum', cierre.total_bizum],
        ['Transferencia', cierre.total_transferencia],
        ['Invitaciones', cierre.total_invitaciones],
      ]
    : []

  const fechaStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-[#f4f6f9] p-4 dark:bg-[#0f1117] md:p-7">
      <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
        Dashboard
      </h1>
      <p className="mb-6 text-sm capitalize text-[#6b7280] dark:text-[#8b90a7]">
        {fechaStr}
      </p>

      {alertas.length > 0 ? (
        <div
          className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4"
          role="alert"
        >
          <AlertTriangle
            size={20}
            strokeWidth={1.5}
            className="flex-shrink-0 text-red-500"
          />
          <p className="text-[15px] text-red-600 dark:text-red-400">
            {alertas.length} artículos con stock bajo mínimo — revisar
            inventario
          </p>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas hoy"
          value={fmtEuroNum(data.ventas_hoy)}
          Icon={DollarSign}
          color="amber"
        />
        <StatCard
          label="Tickets hoy"
          value={String(data.num_tickets_hoy)}
          Icon={ShoppingCart}
          color="white"
        />
        <StatCard
          label="Ticket medio"
          value={fmtEuroNum(data.ticket_medio)}
          Icon={TrendingUp}
          color="white"
        />
        <StatCard
          label="Mesas ocupadas"
          value={`${data.mesas_ocupadas}/${data.total_mesas}`}
          Icon={LayoutGrid}
          color="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 dark:border-[#2e3347] dark:bg-[#1a1d27] lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Top productos hoy
          </h2>
          {topProductos.length === 0 ? (
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
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
                  <div className="h-2 w-32 rounded-full bg-[#f0f2f5] dark:bg-[#222536]">
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

        <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 dark:border-[#2e3347] dark:bg-[#1a1d27]">
          <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Cierre del día
          </h2>
          {filasCierre.map(([label, valor]) => (
            <div
              key={label}
              className="flex justify-between border-b border-[#e2e5ed] py-2 text-[15px] dark:border-[#2e3347]"
            >
              <span className="text-[#6b7280] dark:text-[#8b90a7]">
                {label}
              </span>
              <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                {fmtEuroNum(valor)}
              </span>
            </div>
          ))}
          <div className="flex justify-between pt-3 text-lg font-bold">
            <span className="text-[#111827] dark:text-[#e8eaf0]">Total</span>
            <span className="text-amber-500">
              {fmtEuroNum(cierre.total_ventas)}
            </span>
          </div>
          <p className="mt-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            {cierre.num_tickets} tickets · Ticket medio:{' '}
            {fmtEuroNum(cierre.ticket_medio)}
          </p>
        </div>
      </div>
    </div>
  )
}
