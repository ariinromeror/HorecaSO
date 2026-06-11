import { X } from 'lucide-react'
import Loader from '../../../components/shared/Loader'
import { fechaCortaFactura, formatEuro } from '../constants'
import PagoFacturaModal from './PagoFacturaModal'

export default function FacturaDetalleModal({
  factura,
  loading,
  puedeEscribir,
  onClose,
  onMarcarPagada,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            Líneas de factura
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-2 p-4 text-sm text-[#111827] dark:text-[#e8eaf0]">
          <p>
            <span className="text-[#6b7280] dark:text-[#8b90a7]">
              Proveedor:{' '}
            </span>
            {factura.proveedor_nombre}
          </p>
          <p>
            <span className="text-[#6b7280] dark:text-[#8b90a7]">Fecha: </span>
            {fechaCortaFactura(factura.fecha)}
          </p>
          <p className="text-lg font-bold text-amber-500">
            Total: {formatEuro(factura.total)}
          </p>
          {loading ? (
            <Loader />
          ) : (
            <table className="horeca-body-text mt-4 w-full text-xs">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="py-2 text-left">Artículo</th>
                  <th className="py-2 text-right">Cant.</th>
                  <th className="py-2 text-right">P. unit</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(factura.lineas || []).map((ln) => (
                  <tr
                    key={ln.id}
                    className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                  >
                    <td className="py-2">
                      {ln.articulo_nombre || ln.articulo_id || '—'}
                    </td>
                    <td className="py-2 text-right">{ln.cantidad}</td>
                    <td className="py-2 text-right">
                      {formatEuro(ln.coste_unitario)}
                    </td>
                    <td className="py-2 text-right">
                      {formatEuro(ln.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <PagoFacturaModal
            puedeEscribir={puedeEscribir}
            pagada={factura.pagada}
            onMarcarPagada={onMarcarPagada}
          />
        </div>
      </div>
    </div>
  )
}
