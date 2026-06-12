import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import MesaCard from './components/MesaCard'
import MesasLeyenda from './components/MesasLeyenda'
import { useMesasSala } from './hooks/useMesasSala'

export default function MesasPage() {
  const m = useMesasSala()

  if (m.loading) {
    return <Loader />
  }

  if (m.error) {
    return <EmptyState message={m.error} />
  }

  if (m.mesas.length === 0) {
    return (
      <EmptyState message="No hay mesas configuradas en este local." />
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
        Sala — Mesas
      </h1>
      <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        Pulsa una mesa libre u ocupada para abrir el TPV.
      </p>

      <MesasLeyenda />

      {m.zonasOrdenadas.map((zona) => (
        <section key={zona}>
          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#8b90a7]">
            {zona}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
            {[...m.mesasPorZona[zona]]
              .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
              .map((mesa) => (
                <MesaCard
                  key={mesa.id}
                  mesa={mesa}
                  onNavigate={m.goTpv}
                  onMarcarLibre={m.handleMarcarMesaLibre}
                  liberando={m.liberandoMesaId === mesa.id}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
