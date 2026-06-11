import { Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { CARD_BASE } from '../constants'
import { formatEuro, precioVentaSugerido, readPctCosteVenta } from '../recetasUtils'
import { semaforoMeta } from '../semaforoMeta'

export default function CosteSemaforo({ row, onClick, onDeleteReceta }) {
  const meta = semaforoMeta(row.semaforo)
  const sinPrecioVenta =
    row.es_elaboracion === true ||
    (row.precio_venta == null && row.precio == null)
  const precio = sinPrecioVenta
    ? null
    : row.precio_venta ?? row.precio ?? 0
  const coste =
    row.coste_calculado ?? row.coste ?? null
  const margen = row.margen_porcentaje
  const pctObjetivo = readPctCosteVenta()
  const pvpSugerido =
    row.es_elaboracion !== true &&
    coste != null &&
    Number(coste) > 0
      ? precioVentaSugerido(coste, pctObjetivo)
      : null
  const hoverBorder =
    row.semaforo === 'verde'
      ? 'hover:border-emerald-500'
      : row.semaforo === 'amarillo'
        ? 'hover:border-amber-500'
        : row.semaforo === 'rojo'
          ? 'hover:border-red-500'
          : row.semaforo === 'sin_venta'
            ? 'hover:border-sky-500'
            : 'hover:border-zinc-400 dark:hover:border-zinc-500'
  const showDelete = Boolean(onDeleteReceta && row.receta_id)

  return (
    <div className="relative">
      {showDelete ? (
        <button
          type="button"
          className="absolute right-2 top-2 z-10 rounded-lg p-2 text-[#6b7280] hover:bg-red-500/10 hover:text-red-600 dark:text-[#8b90a7] dark:hover:text-red-400"
          title="Eliminar receta"
          aria-label="Eliminar receta"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteReceta(row)
          }}
        >
          <Trash2 size={18} strokeWidth={1.5} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onClick(row)}
        className={`${CARD_BASE} w-full border-2 text-left shadow-sm hover:scale-[1.01] hover:shadow-md ${hoverBorder}`}
      >
      <div className={`mb-3 h-1.5 w-full rounded-full ${meta.bar}`} />
      <p className="font-medium text-[#111827] dark:text-[#e8eaf0]">
        {row.producto_nombre}
      </p>
      <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        Venta:{' '}
        {precio != null ? formatEuro(precio) : '—'}
      </p>
      <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
        Coste:{' '}
        {coste != null ? formatEuro(coste) : '—'}
      </p>
      {pvpSugerido != null ? (
        <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
          PVP sug. ({pctObjetivo}%):{' '}
          <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
            {formatEuro(pvpSugerido)}
          </span>
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`text-2xl font-bold ${margen != null ? meta.text : 'text-[#6b7280] dark:text-[#8b90a7]'}`}
        >
          {margen != null ? `${Number(margen).toFixed(1)}%` : '—'}
        </span>
        {margen != null && Number(margen) >= 40 ? (
          <TrendingUp
            size={20}
            strokeWidth={1.5}
            className={meta.text}
            aria-hidden
          />
        ) : margen != null ? (
          <TrendingDown
            size={20}
            strokeWidth={1.5}
            className={meta.text}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
        >
          {meta.label}
        </span>
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
          aria-hidden
        />
      </div>
      </button>
    </div>
  )
}
