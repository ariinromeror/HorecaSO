import { ChefHat } from 'lucide-react'
import { emptyKdsCopy } from '../kdsHelpers'
import KdsTicketCard from './KdsTicketCard'

export default function KdsColumnaEstado({ comandas, cambiarEstado, rol }) {
  const copy = emptyKdsCopy(rol)
  return (
    <>
      {comandas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ChefHat
            strokeWidth={1.5}
            className="mb-4 h-20 w-20 text-emerald-500 dark:text-emerald-400"
            aria-hidden
          />
          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            {copy.title}
          </p>
          <p className="mt-2 text-base text-emerald-600/90 dark:text-emerald-400/90">
            {copy.subtitle}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {comandas.map((c) => (
            <KdsTicketCard
              key={c.ticket_id}
              comanda={c}
              cambiarEstado={cambiarEstado}
            />
          ))}
        </div>
      )}
    </>
  )
}
