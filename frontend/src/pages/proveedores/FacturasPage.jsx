import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  FileText,
  Plus,
  ScanLine,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BTN_PRIMARY_FACTURAS, ROLES_ESCRITURA } from './constants'
import EscaneoIAModal from './components/EscaneoIAModal'
import FacturaDetalleModal from './components/FacturaDetalleModal'
import FacturasList from './components/FacturasList'
import NuevaFacturaModal from './components/NuevaFacturaModal'
import { useFacturas } from './hooks/useFacturas'

export default function FacturasPage() {
  const { user } = useAuth()
  const puedeEscribir = ROLES_ESCRITURA.includes(user?.rol)
  const f = useFacturas()

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#f4f6f9] px-4 py-6 dark:bg-[#0f1117] md:px-6">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-amber-500" size={28} strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Facturas de proveedores
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/proveedores"
            className="inline-flex h-10 items-center rounded-lg border border-[#e2e5ed] px-4 text-sm font-medium text-[#111827] dark:border-[#2e3347] dark:text-[#e8eaf0]"
          >
            Proveedores
          </Link>
          {puedeEscribir ? (
            <>
              <button
                type="button"
                onClick={() => f.setModalFactura(true)}
                className={BTN_PRIMARY_FACTURAS}
              >
                <Plus size={18} strokeWidth={1.5} />
                Nueva factura
              </button>
              <button
                type="button"
                onClick={() => {
                  f.setResultadoIA(null)
                  f.setModalIA(true)
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-800 dark:text-amber-400"
              >
                <ScanLine size={18} strokeWidth={1.5} />
                Escanear con IA
              </button>
            </>
          ) : null}
        </div>
      </header>

      {f.feedback?.msg ? (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
            f.feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
        >
          {f.feedback.type === 'ok' ? (
            <Check size={18} strokeWidth={1.5} />
          ) : (
            <AlertTriangle size={18} strokeWidth={1.5} />
          )}
          {f.feedback.msg}
        </div>
      ) : null}

      <FacturasList
        tabActiva={f.tabActiva}
        setTabActiva={f.setTabActiva}
        filtros={f.filtros}
        setFiltros={f.setFiltros}
        syncProveedorUrl={f.syncProveedorUrl}
        proveedores={f.proveedores}
        error={f.error}
        loading={f.loading}
        listaMostrada={f.listaMostrada}
        puedeEscribir={puedeEscribir}
        marcarPagada={f.marcarPagada}
        abrirLineas={f.abrirLineas}
      />

      {f.modalFactura ? (
        <NuevaFacturaModal
          proveedores={f.proveedores}
          articulos={f.articulos}
          onClose={() => f.setModalFactura(false)}
          onGuardado={() => {
            f.setModalFactura(false)
            f.setFeedback({ msg: 'Factura creada', type: 'ok' })
            f.cargarFacturas()
          }}
          onError={(msg) => f.setFeedback({ msg, type: 'err' })}
        />
      ) : null}

      {f.modalLineas ? (
        <FacturaDetalleModal
          factura={f.modalLineas}
          loading={f.lineasDetalleLoading}
          puedeEscribir={puedeEscribir}
          onClose={() => f.setModalLineas(null)}
          onMarcarPagada={() => f.marcarPagada(f.modalLineas.id)}
        />
      ) : null}

      {f.modalIA ? (
        <EscaneoIAModal
          proveedores={f.proveedores}
          articulos={f.articulos}
          escaneando={f.escaneando}
          setEscaneando={f.setEscaneando}
          resultadoIA={f.resultadoIA}
          setResultadoIA={f.setResultadoIA}
          onClose={() => {
            f.setModalIA(false)
            f.setResultadoIA(null)
          }}
          onGuardado={() => {
            f.setModalIA(false)
            f.setResultadoIA(null)
            f.setFeedback({ msg: 'Factura guardada', type: 'ok' })
            f.cargarFacturas()
          }}
          onError={(msg) => f.setFeedback({ msg, type: 'err' })}
        />
      ) : null}
    </div>
  )
}
