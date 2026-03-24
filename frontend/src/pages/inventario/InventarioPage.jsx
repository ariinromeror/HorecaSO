import {
  AlertTriangle,
  ChevronDown,
  Package,
} from 'lucide-react'
import ArticuloModal from './components/ArticuloModal'
import ArticulosTable from './components/ArticulosTable'
import InventarioFisicoModal from './components/InventarioFisicoModal'
import MovimientoModal from './components/MovimientoModal'
import MovimientosTable from './components/MovimientosTable'
import { BTN_SECONDARY, ICON_PROPS } from './constants'
import { useInventarioData } from './hooks/useInventarioData'

export default function InventarioPage() {
  const inv = useInventarioData()

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Package {...ICON_PROPS} className="h-8 w-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#f5f5f5]">
            Inventario
          </h1>
        </div>

        {inv.feedback.msg ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              inv.feedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
            role="status"
          >
            {inv.feedback.msg}
          </div>
        ) : null}

        {inv.alertas.length > 0 ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 gap-3">
                <AlertTriangle
                  {...ICON_PROPS}
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    {inv.alertas.length} artículo
                    {inv.alertas.length !== 1 ? 's' : ''} por debajo del stock
                    mínimo
                  </p>
                  {inv.alertBannerOpen ? (
                    <p className="mt-2 text-sm text-[#374151] dark:text-[#9ca3af] break-words">
                      {inv.alertasInline}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={inv.verTodosAlertas}
                  className={BTN_SECONDARY}
                >
                  Ver todos
                </button>
                <button
                  type="button"
                  onClick={() => inv.setAlertBannerOpen((o) => !o)}
                  className="rounded-lg p-2 text-[#6b7280] hover:bg-black/5 dark:hover:bg-white/5"
                  aria-expanded={inv.alertBannerOpen}
                  aria-label={
                    inv.alertBannerOpen ? 'Colapsar alertas' : 'Expandir alertas'
                  }
                >
                  <ChevronDown
                    {...ICON_PROPS}
                    className={`h-5 w-5 transition-transform ${inv.alertBannerOpen ? '' : '-rotate-90'}`}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-1 border-b border-[#e2e5ed] dark:border-[#2e3347]">
          <button
            type="button"
            onClick={() => inv.setTab('articulos')}
            className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
              inv.tab === 'articulos'
                ? 'text-amber-500'
                : 'text-[#6b7280] dark:text-[#9ca3af]'
            }`}
          >
            Artículos
            {inv.tab === 'articulos' ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => inv.setTab('movimientos')}
            className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
              inv.tab === 'movimientos'
                ? 'text-amber-500'
                : 'text-[#6b7280] dark:text-[#9ca3af]'
            }`}
          >
            Movimientos
            {inv.tab === 'movimientos' ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            ) : null}
          </button>
        </div>

        {inv.tab === 'articulos' ? (
          <ArticulosTable
            buscar={inv.buscar}
            setBuscar={inv.setBuscar}
            categoriaFiltro={inv.categoriaFiltro}
            setCategoriaFiltro={inv.setCategoriaFiltro}
            soloAlertas={inv.soloAlertas}
            setSoloAlertas={inv.setSoloAlertas}
            canEditArticulo={inv.canEditArticulo}
            canMovimiento={inv.canMovimiento}
            loadingArticulos={inv.loadingArticulos}
            articulos={inv.articulos}
            openNuevoArticulo={inv.openNuevoArticulo}
            openInventarioFisico={inv.openInventarioFisico}
            openEditarArticulo={inv.openEditarArticulo}
            openMovimiento={inv.openMovimiento}
          />
        ) : (
          <MovimientosTable
            filtroMovArticulo={inv.filtroMovArticulo}
            setFiltroMovArticulo={inv.setFiltroMovArticulo}
            filtroMovTipo={inv.filtroMovTipo}
            setFiltroMovTipo={inv.setFiltroMovTipo}
            filtroMovDesde={inv.filtroMovDesde}
            setFiltroMovDesde={inv.setFiltroMovDesde}
            filtroMovHasta={inv.filtroMovHasta}
            setFiltroMovHasta={inv.setFiltroMovHasta}
            aplicarFiltrosMovimientos={inv.aplicarFiltrosMovimientos}
            articulosOpciones={inv.articulosOpciones}
            loadingMovimientos={inv.loadingMovimientos}
            movimientosEnriquecidos={inv.movimientosEnriquecidos}
          />
        )}
      </div>

      <ArticuloModal
        modalArticulo={inv.modalArticulo}
        setModalArticulo={inv.setModalArticulo}
        formArticulo={inv.formArticulo}
        setFormArticulo={inv.setFormArticulo}
        submitArticulo={inv.submitArticulo}
        savingArticulo={inv.savingArticulo}
      />

      <MovimientoModal
        modalMovimiento={inv.modalMovimiento}
        setModalMovimiento={inv.setModalMovimiento}
        formMovimiento={inv.formMovimiento}
        setFormMovimiento={inv.setFormMovimiento}
        submitMovimiento={inv.submitMovimiento}
        savingMovimiento={inv.savingMovimiento}
      />

      <InventarioFisicoModal
        modalInventarioFisico={inv.modalInventarioFisico}
        setModalInventarioFisico={inv.setModalInventarioFisico}
        articulosOpciones={inv.articulosOpciones}
        inventarioFisicoData={inv.inventarioFisicoData}
        setInventarioFisicoData={inv.setInventarioFisicoData}
        countInventarioCambios={inv.countInventarioCambios}
        submitInventarioFisico={inv.submitInventarioFisico}
        savingInventario={inv.savingInventario}
      />
    </div>
  )
}
