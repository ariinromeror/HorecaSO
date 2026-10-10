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
      <p className="mb-4 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
        Pulsa una mesa libre u ocupada para abrir el TPV. Si está reservada,
        verás la hora de la reserva.
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
                  onReservada={m.handleMesaReservada}
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
