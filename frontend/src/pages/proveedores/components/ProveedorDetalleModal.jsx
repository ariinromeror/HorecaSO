import { Link } from 'react-router-dom'
import { Eye, X } from 'lucide-react'
import Loader from '../../../components/shared/Loader'
import { fechaCortaProveedor } from '../constants'

export default function ProveedorDetalleModal({
  modalDetalle,
  detalleLoading,
  onClose,
}) {
  if (!modalDetalle) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            {modalDetalle.nombre}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-2 p-4 text-sm text-[#111827] dark:text-[#e8eaf0]">
          {detalleLoading ? (
            <Loader />
          ) : (
            <>
              <p>
                <span className="text-[#6b7280] dark:text-[#8b90a7]">
                  NIF:{' '}
                </span>
                {modalDetalle.nif || '—'}
              </p>
              <p>
                <span className="text-[#6b7280] dark:text-[#8b90a7]">
                  Email:{' '}
                </span>
                {modalDetalle.email || '—'}
              </p>
              <p>
                <span className="text-[#6b7280] dark:text-[#8b90a7]">
                  Teléfono:{' '}
                </span>
                {modalDetalle.telefono || '—'}
              </p>
              <p>
                <span className="text-[#6b7280] dark:text-[#8b90a7]">
                  Condiciones:{' '}
                </span>
                {modalDetalle.condiciones_pago || '—'}
              </p>
              <p>
                <span className="text-[#6b7280] dark:text-[#8b90a7]">
                  Entrega:{' '}
                </span>
                {modalDetalle.dias_entrega ?? '—'} días
              </p>
              <h3 className="mt-4 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                Últimas facturas
              </h3>
              <ul className="space-y-2">
                {(modalDetalle.facturas_recientes || []).length === 0 ? (
                  <li className="text-[#6b7280] dark:text-[#8b90a7]">
                    Sin facturas recientes
                  </li>
                ) : (
                  (modalDetalle.facturas_recientes || []).map((f) => (
                    <li
                      key={f.id}
                      className="flex justify-between gap-2 rounded-lg border border-[#e2e5ed] px-3 py-2 dark:border-[#2e3347]"
                    >
                      <span>
                        {fechaCortaProveedor(f.fecha)} ·{' '}
                        {f.numero_factura || 'S/N'}
                      </span>
                      <span className="shrink-0">
                        {f.pagada ? (
                          <span className="text-emerald-600">Pagada</span>
                        ) : (
                          <span className="text-amber-600">Pendiente</span>
                        )}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <Link
                to={`/proveedores/facturas?proveedor_id=${modalDetalle.id}`}
                onClick={onClose}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-black"
              >
                <Eye size={18} strokeWidth={1.5} />
                Ver todas las facturas
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
