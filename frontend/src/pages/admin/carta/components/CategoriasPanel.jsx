import { AlertTriangle, Edit, Plus, Trash2 } from 'lucide-react'
import { stripEmojis } from '../../../../utils/textSanitize'
import { BTN_DANGER, BTN_PRIMARY, CARD } from '../constants'

export default function CategoriasPanel({
  errorCat,
  loadingCat,
  categoriasOrdenadas,
  openCategoriaModal,
  handleDeleteCategoria,
}) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => openCategoriaModal(null)}
          className={`flex h-12 items-center gap-2 px-6 ${BTN_PRIMARY}`}
        >
          <Plus size={20} strokeWidth={1.5} />
          Nueva categoría
        </button>
      </div>
      {errorCat ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[15px] text-red-600 dark:text-red-400">
          <AlertTriangle size={20} strokeWidth={1.5} />
          {errorCat}
        </div>
      ) : null}
      {loadingCat ? (
        <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Cargando categorías…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoriasOrdenadas.map((cat) => (
            <div key={cat.id} className={`${CARD} p-5 shadow-sm`}>
              <div className="flex gap-4">
                <div
                  className="h-14 w-14 shrink-0 rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]"
                  style={{ backgroundColor: cat.color || '#f59e0b' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    {stripEmojis(cat.nombre || '').trim() || '—'}
                  </p>
                  <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Icono:{' '}
                    <span className="font-mono text-xs">
                      {stripEmojis(cat.icono || '').trim() || '—'}
                    </span>
                  </p>
                  <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Orden: {cat.orden ?? 0}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openCategoriaModal(cat)}
                  className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
                >
                  <Edit size={18} strokeWidth={1.5} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategoria(cat)}
                  className={`flex h-10 items-center gap-1 ${BTN_DANGER}`}
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
