import { Calendar, Package, Plus, Trash2, TrendingDown } from 'lucide-react'
import StatCard from '../../components/shared/StatCard'
import MermaModal from './components/MermaModal'
import MermasList from './components/MermasList'
import { BTN_PRIMARY_MERMAS, formatEuro2, ICON_MERMAS } from './mermasConstants'
import { useMermas } from './hooks/useMermas'

export default function MermasPage() {
  const m = useMermas()

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Trash2
                {...ICON_MERMAS}
                className="h-8 w-8 shrink-0 text-red-500"
              />
              <h1 className="text-2xl font-bold text-[#111827] dark:text-[#f5f5f5]">
                Mermas
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
              Registro de pérdidas y control de desperdicios
            </p>
          </div>
          {m.canRegistrarMerma ? (
            <button type="button" onClick={m.openModal} className={BTN_PRIMARY_MERMAS}>
              <Plus {...ICON_MERMAS} className="h-5 w-5" />
              Registrar merma
            </button>
          ) : null}
        </div>

        {m.feedback.msg ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              m.feedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
            role="status"
          >
            {m.feedback.msg}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard
            label="Total mermas hoy"
            value={m.resumen.mermasHoy}
            Icon={Calendar}
            color="white"
          />
          <StatCard
            label="Coste mermas hoy"
            value={formatEuro2(m.resumen.costeHoy)}
            Icon={TrendingDown}
            color="red"
          />
          <StatCard
            label="Total mermas periodo"
            value={m.resumen.totalPeriodo}
            Icon={Package}
            color="white"
          />
          <StatCard
            label="Coste total periodo"
            value={formatEuro2(m.resumen.costePeriodo)}
            Icon={Trash2}
            color="red"
          />
        </div>

        <MermasList
          filtros={m.filtros}
          setFiltros={m.setFiltros}
          aplicarFiltros={m.aplicarFiltros}
          loadingArticulos={m.loadingArticulos}
          articulos={m.articulos}
          loadingMovimientos={m.loadingMovimientos}
          movimientos={m.movimientos}
        />
      </div>

      <MermaModal
        modalMerma={m.modalMerma}
        setModalMerma={m.setModalMerma}
        comboArticuloRef={m.comboArticuloRef}
        buscarArticulo={m.buscarArticulo}
        setBuscarArticulo={m.setBuscarArticulo}
        listaAbierta={m.listaAbierta}
        setListaAbierta={m.setListaAbierta}
        articulosFiltrados={m.articulosFiltrados}
        seleccionarArticulo={m.seleccionarArticulo}
        articuloSeleccionado={m.articuloSeleccionado}
        setArticuloSeleccionado={m.setArticuloSeleccionado}
        setFormMerma={m.setFormMerma}
        formMerma={m.formMerma}
        validarCantidad={m.validarCantidad}
        cantidadError={m.cantidadError}
        submitMerma={m.submitMerma}
        saving={m.saving}
      />
    </div>
  )
}
