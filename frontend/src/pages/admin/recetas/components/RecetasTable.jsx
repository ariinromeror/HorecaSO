import { useMemo } from 'react'
import CosteSemaforo from './CosteSemaforo'

export default function RecetasTable({
  loadingSemaforo,
  recetasSemaforo,
  filtroColor,
  setFiltroColor,
  onCardClick,
}) {
  const conteos = useMemo(() => {
    let v = 0
    let a = 0
    let r = 0
    for (const row of recetasSemaforo) {
      if (row.semaforo === 'verde') v += 1
      else if (row.semaforo === 'amarillo') a += 1
      else if (row.semaforo === 'rojo') r += 1
    }
    return { verde: v, amarillo: a, rojo: r }
  }, [recetasSemaforo])

  const cardsFiltradas = useMemo(() => {
    if (filtroColor === 'todos') return recetasSemaforo
    return recetasSemaforo.filter((row) => row.semaforo === filtroColor)
  }, [recetasSemaforo, filtroColor])

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <span
          className="inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-500"
        >
          Verde {conteos.verde} platos
        </span>
        <span
          className="inline-flex items-center rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-500"
        >
          Amarillo {conteos.amarillo} platos
        </span>
        <span
          className="inline-flex items-center rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500"
        >
          Rojo {conteos.rojo} platos
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'verde', label: 'Verde' },
          { id: 'amarillo', label: 'Amarillo' },
          { id: 'rojo', label: 'Rojo' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltroColor(f.id)}
            className={`h-10 rounded-lg px-4 text-[15px] font-medium transition-colors ${
              filtroColor === f.id
                ? 'bg-amber-500 text-black'
                : 'border border-[#e2e5ed] bg-[#f0f2f5] text-[#6b7280] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#8b90a7]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadingSemaforo ? (
        <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Cargando…
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cardsFiltradas.map((row) => (
            <CosteSemaforo
              key={`${row.producto_id}-${row.receta_id || 'nr'}`}
              row={row}
              onClick={onCardClick}
            />
          ))}
        </div>
      )}
    </>
  )
}
