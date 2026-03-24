import { Plus } from 'lucide-react'
import { stripEmojis } from '../../../utils/textSanitize'
import { formatEuro } from '../constants'

export default function CartaPanel({
  categorias,
  categActiva,
  setCategActiva,
  productosActivos,
  handleAddLinea,
  actionLoading,
  ticket,
}) {
  return (
    <>
      <div className="sticky top-0 z-10 flex shrink-0 gap-2 overflow-x-auto border-b border-[#e2e5ed] bg-white p-3 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        {categorias.map((cat, i) => {
          const active = i === categActiva
          const tabLabel =
            stripEmojis(cat.nombre || '').trim() || 'Sin nombre'
          return (
            <button
              key={cat.id || i}
              type="button"
              onClick={() => setCategActiva(i)}
              className={[
                'whitespace-nowrap rounded-lg px-4 py-2 text-[14px]',
                active
                  ? 'border border-amber-500/30 bg-amber-500/10 font-medium text-amber-500'
                  : 'text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]',
              ].join(' ')}
            >
              {tabLabel}
            </button>
          )
        })}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {productosActivos.map((p) => {
              const busy = !!actionLoading[p.id]
              const disabled = !ticket || busy
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-disabled={disabled}
                  aria-label={`Añadir ${p.nombre}`}
                  onClick={() => {
                    if (!disabled) handleAddLinea(p.id)
                  }}
                  onKeyDown={(e) => {
                    if (
                      !disabled &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault()
                      handleAddLinea(p.id)
                    }
                  }}
                  className={[
                    'group flex h-auto cursor-pointer flex-col gap-1.5 rounded-xl border border-[#e2e5ed] bg-white p-3 transition-all duration-150 dark:border-[#2e3347] dark:bg-[#1a1d27]',
                    disabled
                      ? 'pointer-events-none cursor-not-allowed opacity-40'
                      : 'hover:border-amber-500 hover:shadow-md active:scale-95',
                  ].join(' ')}
                >
                  <span className="min-h-[2.5rem] text-[14px] font-medium leading-tight text-[#111827] line-clamp-2 dark:text-[#e8eaf0]">
                    {p.nombre}
                  </span>
                  <span className="text-sm font-bold text-amber-500">
                    {formatEuro(p.precio)}
                  </span>
                  <span
                    className="flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-amber-500 text-xs font-semibold text-black transition-colors pointer-events-none select-none group-hover:bg-amber-600 dark:bg-amber-500 dark:group-hover:bg-amber-600"
                    aria-hidden
                  >
                    <Plus size={12} strokeWidth={1.5} />
                    Añadir
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
