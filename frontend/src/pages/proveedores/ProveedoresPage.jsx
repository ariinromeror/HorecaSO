import { AlertTriangle, Check, Plus, Truck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BTN_PRIMARY_PROVEEDOR, ROLES_ESCRITURA } from './constants'
import ProveedorDetalleModal from './components/ProveedorDetalleModal'
import ProveedorModal from './components/ProveedorModal'
import ProveedoresTable from './components/ProveedoresTable'
import { useProveedores } from './hooks/useProveedores'

export default function ProveedoresPage() {
  const { user } = useAuth()
  const puedeEscribir = ROLES_ESCRITURA.includes(user?.rol)
  const p = useProveedores()

  return (
    <div className="min-h-screen bg-[#f4f6f9] px-4 py-6 dark:bg-[#0f1117] md:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Truck className="text-amber-500" size={28} strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Proveedores
          </h1>
        </div>
        {puedeEscribir ? (
          <button
            type="button"
            onClick={() => p.setModalProveedor('nuevo')}
            className={BTN_PRIMARY_PROVEEDOR}
          >
            <Plus size={18} strokeWidth={1.5} />
            Nuevo proveedor
          </button>
        ) : null}
      </header>

      {p.feedback?.msg ? (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
            p.feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
          role="status"
        >
          {p.feedback.type === 'ok' ? (
            <Check size={18} strokeWidth={1.5} />
          ) : (
            <AlertTriangle size={18} strokeWidth={1.5} />
          )}
          {p.feedback.msg}
        </div>
      ) : null}

      <ProveedoresTable
        buscarInput={p.buscarInput}
        setBuscarInput={p.setBuscarInput}
        soloActivos={p.soloActivos}
        setSoloActivos={p.setSoloActivos}
        loading={p.loading}
        error={p.error}
        proveedores={p.proveedores}
        puedeEscribir={puedeEscribir}
        abrirDetalle={p.abrirDetalle}
        setModalProveedor={p.setModalProveedor}
        handleDesactivar={p.handleDesactivar}
      />

      {p.modalProveedor ? (
        <ProveedorModal
          initial={p.modalProveedor === 'nuevo' ? null : p.modalProveedor}
          onClose={() => p.setModalProveedor(null)}
          onGuardado={() => {
            p.setModalProveedor(null)
            p.setFeedback({ msg: 'Guardado correctamente', type: 'ok' })
            p.cargar()
          }}
          onError={(msg) => p.setFeedback({ msg, type: 'err' })}
        />
      ) : null}

      <ProveedorDetalleModal
        modalDetalle={p.modalDetalle}
        detalleLoading={p.detalleLoading}
        onClose={() => p.setModalDetalle(null)}
      />
    </div>
  )
}
