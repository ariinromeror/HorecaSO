/** Fila nombre + cantidad + barra — responsive en móvil (sin overflow). */
export default function TopProductoRow({ nombre, cantidad, pct }) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2 sm:gap-3">
      <span className="min-w-0 flex-1 truncate text-[15px] text-[#111827] dark:text-[#e8eaf0]">
        {nombre}
      </span>
      <span className="horeca-nums w-7 shrink-0 text-right text-sm text-[#6b7280] dark:text-[#8b90a7]">
        {cantidad}
      </span>
      <div className="h-2 min-w-[3rem] max-w-28 flex-1 shrink rounded-full bg-[#f0f2f5] dark:bg-[#222536] sm:max-w-32">
        <div
          className="h-2 rounded-full bg-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
